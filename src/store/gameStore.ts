import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { GameState, Card } from '../types/database.types';

export type ExtendedGameState = GameState & {
  card: Card;
};

interface GameStoreState {
  hand: ExtendedGameState[];        // active cards in hand (in_hand status)
  allPlayerCards: ExtendedGameState[]; // full inventory for the cemetery view
  board: ExtendedGameState[];
  isLoading: boolean;
  error: string | null;
  subscription: any | null;
  
  loadGame: (matchId: string, userId: string) => Promise<void>;
  subscribeToMatch: (matchId: string, userId: string) => void;
  unsubscribe: () => void;
  playCard: (gameStateId: string, targetId: string) => Promise<void>;
  updateCardStatus: (gameStateId: string, status: GameState['status']) => Promise<void>;
  /**
   * BUG3 FIX: Dual-transaction action.
   * Resolves a pending challenge AND burns the comodin card from the player's hand
   * in a single coordinated operation.
   * @param challengeId - ID of the pending game_state row (the reto received)
   * @param challengeStatus - new status for the challenge ('discarded' | 'bounced')
   * @param comodinId - ID of the comodin game_state row to burn from hand
   */
  useComodinAndResolve: (
    challengeId: string,
    challengeStatus: 'discarded' | 'bounced',
    comodinId: string
  ) => Promise<void>;
  reset: () => void;
}

const initialState = {
  hand: [] as ExtendedGameState[],
  allPlayerCards: [] as ExtendedGameState[],
  board: [] as ExtendedGameState[],
  isLoading: false,
  error: null,
  subscription: null,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...initialState,

  reset: () => {
    const { subscription } = get();
    if (subscription) subscription.unsubscribe();
    set(initialState);
  },

  loadGame: async (matchId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select(`*, card:cards (*)`)
        .eq('match_id', matchId);

      if (error) throw error;

      if (data) {
        // Strategy: a card "belongs" to a player if:
        // a) player_id is currently userId (in_hand, completed, discarded, bounced), OR
        // b) it was played to the opponent and is still pending.
        // Since we lose track of (b) when player_id flips to opponent,
        // we use the fact that ALL pending cards visible to THIS match are already in `data`.
        // We separate them by filtering the full dataset:

        const allMyCards = data.filter(
          (item) => item.player_id === userId
        ) as ExtendedGameState[];

        // Played cards = pending cards where player_id is NOT userId.
        // These are cards the opponent sent to me OR cards I sent to opponent.
        // We include them in the board separately — they are NOT my inventory anymore.
        // So allPlayerCards = cards currently mine (all statuses).
        const allPlayerCards = allMyCards;

        // hand = subset that is still playable
        const hand = allMyCards.filter((item) => item.status === 'in_hand');

        // board = all pending cards in the match (regardless of who sent them)
        const board = data.filter(
          (item) => item.status === 'pending'
        ) as ExtendedGameState[];

        set({ hand, allPlayerCards, board });
      }
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
      .channel(`game_${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `match_id=eq.${matchId}` },
        () => {
          // Full reload on any change — simple and consistent for MVP
          loadGame(matchId, userId);
        }
      )
      .subscribe();

    set({ subscription: newSub });
  },

  unsubscribe: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null, hand: [], board: [] });
    }
  },

  playCard: async (gameStateId: string, targetId: string) => {
    try {
      const { error } = await supabase
        .from('game_state')
        .update({
          status: 'pending',
          player_id: targetId,
          played_at: new Date().toISOString()
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

  // BUG3 FIX: Dual transaction — resolve challenge + burn comodin simultaneously
  useComodinAndResolve: async (challengeId, challengeStatus, comodinId) => {
    try {
      const now = new Date().toISOString();
      // Two updates in parallel for speed — both must succeed
      const [res1, res2] = await Promise.all([
        supabase
          .from('game_state')
          .update({ status: challengeStatus, resolved_at: now })
          .eq('id', challengeId),
        supabase
          .from('game_state')
          .update({ status: 'discarded', resolved_at: now })
          .eq('id', comodinId)
      ]);

      if (res1.error) throw res1.error;
      if (res2.error) throw res2.error;
    } catch (error: any) {
      set({ error: error.message });
    }
  }
}));
