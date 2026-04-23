import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useGameStore } from './gameStore';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, Match } from '../types/database.types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  match: Match | null;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signUpAnonymously: (displayName: string) => Promise<void>;
  joinMatch: (matchCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  session: null,
  user: null,
  profile: null,
  match: null,
  isLoading: true,
  error: null,
};

// ─── DEALER ──────────────────────────────────────────────────────────────────
// Runs ONLY on the Host client (player1_id === current user).
// Fetches all 50 cards, shuffles, and inserts 25 to each player.
// Idempotent: checks game_state row count first to prevent double-dealing.
async function dealCards(matchId: string, player1Id: string, player2Id: string) {
  // Guard: if cards already dealt, bail out immediately
  const { count } = await supabase
    .from('game_state')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId);

  if (count && count > 0) {
    console.log('[Dealer] Cards already dealt, skipping.');
    return;
  }

  const { data: cards, error } = await supabase.from('cards').select('*');
  if (error || !cards || cards.length < 44) {
    console.error('[Dealer] Failed to fetch cards or not enough cards:', error, cards?.length);
    return;
  }

  // Fisher-Yates shuffle
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const retos   = deck.filter(c => c.tipo === 'Reto');
  const comodines = deck.filter(c => c.tipo === 'Comodín');

  if (retos.length < 44 || comodines.length < 6) {
    console.error('[Dealer] Not enough retos or comodines:', retos.length, comodines.length);
    return;
  }

  const now = new Date().toISOString();
  const assignments = [
    // 22 retos each
    ...retos.slice(0, 22).map(c  => ({ match_id: matchId, card_id: c.id, player_id: player1Id, status: 'in_hand', created_at: now })),
    ...retos.slice(22, 44).map(c => ({ match_id: matchId, card_id: c.id, player_id: player2Id, status: 'in_hand', created_at: now })),
    // 3 comodines each
    ...comodines.slice(0, 3).map(c => ({ match_id: matchId, card_id: c.id, player_id: player1Id, status: 'in_hand', created_at: now })),
    ...comodines.slice(3, 6).map(c => ({ match_id: matchId, card_id: c.id, player_id: player2Id, status: 'in_hand', created_at: now })),
  ];

  const { error: insertError } = await supabase.from('game_state').insert(assignments);
  if (insertError) {
    console.error('[Dealer] Insert failed:', insertError);
  } else {
    console.log(`[Dealer] Dealt ${assignments.length} cards successfully.`);
  }
}

// ─── STORE ───────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState, isLoading: false }),

  initialize: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (session) {
        set({ session, user: session.user });

        // Rehydrate profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        if (profileData) set({ profile: profileData });

        // Rehydrate most recent active match
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .or(`player1_id.eq.${session.user.id},player2_id.eq.${session.user.id}`)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (matchError) throw matchError;

        if (matchData) {
          set({ match: matchData });

          // If match is fully paired (player2 present) and user is HOST → check if dealing needed
          if (matchData.player2_id && matchData.player1_id === session.user.id) {
            // Run deal in background — idempotent guard prevents duplicates
            dealCards(matchData.id, matchData.player1_id, matchData.player2_id);
          }

          // If match is waiting for player2 (host waiting screen), subscribe to updates
          if (!matchData.player2_id) {
            supabase
              .channel(`match_update_${matchData.id}`)
              .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchData.id}` },
                async (payload) => {
                  const updatedMatch = payload.new as Match;
                  if (updatedMatch.player2_id && updatedMatch.status === 'active') {
                    set({ match: updatedMatch });
                    // Host is the Dealer — deal cards now that both players are here
                    await dealCards(updatedMatch.id, updatedMatch.player1_id, updatedMatch.player2_id);
                  }
                }
              )
              .subscribe();
          }
        }
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (!session) get().reset();
    });
  },

  signUpAnonymously: async (displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      if (authData.user) {
        const matchCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: authData.user.id, display_name: displayName, match_code: matchCode }]);
        if (profileError) throw profileError;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        // Archive any stale open matches from a previous session
        await supabase
          .from('matches')
          .update({ status: 'finished' })
          .eq('player1_id', authData.user.id)
          .eq('status', 'active')
          .is('player2_id', null);

        // Create fresh match — player2_id is null (waiting)
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .insert([{ player1_id: authData.user.id, status: 'active' }])
          .select()
          .single();
        if (matchError) throw matchError;

        set({ profile, match: matchData });

        // ── HOST REALTIME LISTENER ──────────────────────────────────────────
        // When player2 joins, the Host is the Dealer → deal cards immediately
        supabase
          .channel(`match_update_${matchData.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchData.id}` },
            async (payload) => {
              const updatedMatch = payload.new as Match;
              if (updatedMatch.player2_id && updatedMatch.status === 'active') {
                // Update match state (triggers App.tsx routing to GameScreen)
                set({ match: updatedMatch });
                // Deal cards — only Host does this, idempotent guard inside
                await dealCards(updatedMatch.id, updatedMatch.player1_id, updatedMatch.player2_id);
              }
            }
          )
          .subscribe();
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  joinMatch: async (matchCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = get();
      if (!user) throw new Error('Must be logged in to join a match');

      // Find the Host's profile by match code
      const { data: partnerProfile, error: partnerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('match_code', matchCode.toUpperCase())
        .single();
      if (partnerError || !partnerProfile) throw new Error('Código inválido o no encontrado');
      if (partnerProfile.id === user.id) throw new Error('No podés emparejarte con vos mismo');

      // Find the Host's open match
      const { data: existingMatch, error: findMatchError } = await supabase
        .from('matches')
        .select('*')
        .eq('player1_id', partnerProfile.id)
        .is('player2_id', null)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findMatchError || !existingMatch) throw new Error('La partida no está disponible o ya está llena');

      // Claim the slot as player2 — this UPDATE triggers the Host's Realtime listener
      // which will then deal the cards. Guest does NOT deal.
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .update({ player2_id: user.id })
        .eq('id', existingMatch.id)
        .select()
        .single();
      if (matchError) throw matchError;

      // Guest sets match → App.tsx routes to GameScreen → loadGame + subscribeToMatch
      // The Realtime subscription on game_state will fire when Host deals cards,
      // triggering loadGame automatically for the Guest.
      set({ match: matchData });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      get().reset();
      useGameStore.getState().reset();
    } catch (error) {
      console.error('Error during signOut:', error);
    }
  },
}));
