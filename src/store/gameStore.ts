import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { GameState, Card } from '../types/database.types';

export type ExtendedGameState = GameState & {
  card: Card;
};

interface GameStoreState {
  /** Cards currently in my hand (in_hand, comodines and retos I own) */
  hand: ExtendedGameState[];
  /** Full original inventory — includes used cards for the cemetery view */
  allPlayerCards: ExtendedGameState[];
  /** Pending challenges — retos sent TO me that need resolution */
  incomingChallenges: ExtendedGameState[];
  /** Pending challenges — retos I sent, waiting for opponent */
  outgoingChallenges: ExtendedGameState[];
  /** Resolved events for the history feed */
  history: ExtendedGameState[];
  isLoading: boolean;
  error: string | null;
  subscription: any | null;

  loadGame: (matchId: string, userId: string) => Promise<void>;
  subscribeToMatch: (matchId: string, userId: string) => void;
  unsubscribe: () => void;
  playCard: (gameStateId: string, targetPlayerId: string) => Promise<void>;
  updateCardStatus: (gameStateId: string, status: GameState['status']) => Promise<void>;
  useComodinAndResolve: (
    challengeId: string,
    challengeStatus: 'discarded' | 'bounced',
    comodinId: string
  ) => Promise<void>;
  reset: () => void;
}

const initialState: Omit<GameStoreState, 'loadGame' | 'subscribeToMatch' | 'unsubscribe' | 'playCard' | 'updateCardStatus' | 'useComodinAndResolve' | 'reset'> = {
  hand: [],
  allPlayerCards: [],
  incomingChallenges: [],
  outgoingChallenges: [],
  history: [],
  isLoading: false,
  error: null,
  subscription: null,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...(initialState as GameStoreState),

  reset: () => {
    const { subscription } = get();
    if (subscription) subscription.unsubscribe();
    set(initialState as Partial<GameStoreState>);
  },

  loadGame: async (matchId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select(`*, card:cards (*)`)
        .eq('match_id', matchId);

      if (error) throw error;
      if (!data) return;

      const all = data as ExtendedGameState[];

      // ─── PILAR 1 FIX: "Fuga de Cartas" ──────────────────────────────────────
      // Problem: when a card is played, player_id flips to opponent, so we lose
      // track of original ownership. Solution: the initial deal sets all 25 cards
      // with player_id = userId and status = 'in_hand'. We identify "my original
      // cards" as ANY row that was EVER assigned to userId (currently OR previously).
      // We track this by fetching rows where player_id = userId (current) PLUS rows
      // that were originally mine but are now pending (player_id changed to opponent).
      //
      // The key insight: if a card is 'pending' and player_id ≠ userId, it was
      // played by one of the two players. We need to know WHO played it.
      // Since played_at is set when played, we use the fact that original cards
      // for userId have card_id values in the first batch inserted for that user.
      // Simplest correct approach: query game_state with a broader filter.
      //
      // Real fix: we track original_player by looking at rows that are 'pending'
      // but whose card_id was in the original hand of userId.
      // We get this by checking: was this card_id initially assigned to me?
      // Initial assignment = rows where status was 'in_hand' at some point for me.
      // Since we can't query history, we identify my cards as:
      //   "all rows where player_id is currently me (any status) OR
      //    rows that are 'pending' where the counterpart row for same card in
      //    this match was originally mine"
      //
      // CLEANEST SOLUTION for MVP without DB migration:
      // Each player gets exactly 25 cards in the deal. The deal creates exactly
      // 25 rows with player_id = userId. After dealing, if I play a card, its
      // player_id flips. So "my inventory" = rows currently mine + rows I played.
      // We detect rows I played: pending rows where player_id ≠ userId.
      // These could be opponent's plays TO me, or my plays TO opponent.
      // We distinguish: if status='pending' AND player_id≠userId → it's a challenge
      // SENT TO ME by opponent. My played cards would be 'pending' AND player_id=
      // opponent... but wait: when I play, I set player_id to opponent AND status to
      // 'pending'. When opponent plays, same. The only way to tell is original
      // ownership. Since we can't tell without extra data, we use a pragmatic rule:
      //
      // PRAGMATIC RULE: My original cards = first 25 rows inserted for matchId
      // where the initial player_id was me. Since DB ordering by created_at shows
      // the deal in order, and the deal alternates p1/p2, we can identify mine by
      // looking at ALL rows for the match and checking which had player_id=userId
      // at creation time — which equals "rows currently assigned to me (any status)
      // plus pending rows that were played BY ME (we detect these as pending rows
      // where played_at is set and the row was previously mine)."
      //
      // The simplest MVP fix: Add a WHERE clause that fetches cards originally mine
      // by looking at non-pending rows with my player_id PLUS all pending rows.
      // Then in the UI, we show pending rows in the BOARD not in the hand.

      // Cards currently assigned to me (in_hand / completed / discarded / bounced)
      const myCurrentCards = all.filter(r => r.player_id === userId);

      // Pending cards: could be sent TO me (opponent played) or sent BY me (I played)
      const pendingCards = all.filter(r => r.status === 'pending');

      // Cards sent TO me = pending where player_id IS me (opponent reassigned to me)
      const incomingChallenges = pendingCards.filter(r => r.player_id === userId);

      // Cards sent BY me = pending where player_id is NOT me (I reassigned to opponent)
      // These are my cards that left my hand — still my "inventory" for cemetery
      const outgoingChallenges = pendingCards.filter(r => r.player_id !== userId);

      // My full original inventory = current cards + cards I played (outgoing)
      const allPlayerCards = [...myCurrentCards, ...outgoingChallenges];

      // Active hand = only in_hand cards (no pending, no used)
      const hand = myCurrentCards.filter(r => r.status === 'in_hand');

      // History = resolved cards across the whole match (for feed)
      const history = all.filter(r =>
        r.status === 'completed' || r.status === 'discarded' || r.status === 'bounced'
      );

      set({ hand, allPlayerCards, incomingChallenges, outgoingChallenges, history });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToMatch: (matchId: string, userId: string) => {
    const { subscription, loadGame } = get();
    if (subscription) subscription.unsubscribe();

    const newSub = supabase
      .channel(`game_${matchId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `match_id=eq.${matchId}` },
        () => loadGame(matchId, userId)
      )
      .subscribe();

    set({ subscription: newSub });
  },

  unsubscribe: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null });
    }
  },

  playCard: async (gameStateId: string, targetPlayerId: string) => {
    try {
      const { error } = await supabase
        .from('game_state')
        .update({
          status: 'pending',
          player_id: targetPlayerId,
          played_at: new Date().toISOString(),
        })
        .eq('id', gameStateId);
      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateCardStatus: async (gameStateId: string, status: GameState['status']) => {
    try {
      const { error } = await supabase
        .from('game_state')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', gameStateId);
      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  useComodinAndResolve: async (challengeId, challengeStatus, comodinId) => {
    try {
      const now = new Date().toISOString();
      const [res1, res2] = await Promise.all([
        supabase
          .from('game_state')
          .update({ status: challengeStatus, resolved_at: now })
          .eq('id', challengeId),
        supabase
          .from('game_state')
          .update({ status: 'discarded', resolved_at: now })
          .eq('id', comodinId),
      ]);
      if (res1.error) throw res1.error;
      if (res2.error) throw res2.error;
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
