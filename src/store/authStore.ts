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

// ─── DEALER FUNCTION (idempotent) ─────────────────────────────────────────────
// Can be called by any player — the idempotency guard ensures only one deal happens.
// Fisher-Yates shuffle for statistically correct randomness.
export async function dealCards(matchId: string, player1Id: string, player2Id: string): Promise<boolean> {
  try {
    // Guard: abort if cards already exist for this match
    const { count, error: countError } = await supabase
      .from('game_state')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId);

    if (countError) {
      console.error('[Dealer] Count check failed:', countError);
      return false;
    }
    if (count && count > 0) {
      console.log('[Dealer] Cards already dealt:', count);
      return true;
    }

    // Fetch all cards
    const { data: cards, error: cardsError } = await supabase.from('cards').select('*');
    if (cardsError || !cards) {
      console.error('[Dealer] Failed to fetch cards:', cardsError);
      return false;
    }

    const retos    = cards.filter(c => c.tipo === 'Reto');
    const comodines = cards.filter(c => c.tipo === 'Comodín');

    if (retos.length < 44 || comodines.length < 6) {
      console.error('[Dealer] Not enough cards. Retos:', retos.length, 'Comodines:', comodines.length);
      return false;
    }

    // Fisher-Yates shuffle
    const shuffleArr = <T>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const shuffledRetos    = shuffleArr(retos);
    const shuffledComodines = shuffleArr(comodines);

    const assignments = [
      ...shuffledRetos.slice(0, 22).map(c  => ({ match_id: matchId, card_id: c.id, player_id: player1Id, status: 'in_hand' })),
      ...shuffledRetos.slice(22, 44).map(c => ({ match_id: matchId, card_id: c.id, player_id: player2Id, status: 'in_hand' })),
      ...shuffledComodines.slice(0, 3).map(c => ({ match_id: matchId, card_id: c.id, player_id: player1Id, status: 'in_hand' })),
      ...shuffledComodines.slice(3, 6).map(c => ({ match_id: matchId, card_id: c.id, player_id: player2Id, status: 'in_hand' })),
    ];

    const { error: insertError } = await supabase.from('game_state').insert(assignments);
    if (insertError) {
      console.error('[Dealer] Insert failed:', insertError);
      return false;
    }

    console.log(`[Dealer] ✅ Dealt ${assignments.length} cards for match ${matchId}`);
    return true;
  } catch (err) {
    console.error('[Dealer] Unexpected error:', err);
    return false;
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

        const { data: profileData, error: profileError } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        if (profileData) set({ profile: profileData });

        const { data: matchData, error: matchError } = await supabase
          .from('matches').select('*')
          .or(`player1_id.eq.${session.user.id},player2_id.eq.${session.user.id}`)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle();
        if (matchError) throw matchError;

        if (matchData) {
          set({ match: matchData });

          // If match is already paired on hydration, attempt deal immediately (idempotent)
          if (matchData.player2_id) {
            dealCards(matchData.id, matchData.player1_id, matchData.player2_id);
          }

          // Subscribe to match updates (works if matches table has Realtime enabled)
          if (!matchData.player2_id) {
            supabase
              .channel(`match_listen_${matchData.id}`)
              .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchData.id}` },
                async (payload) => {
                  const updated = payload.new as Match;
                  if (updated.player2_id && updated.status === 'active') {
                    set({ match: updated });
                    await dealCards(updated.id, updated.player1_id, updated.player2_id);
                  }
                }
              ).subscribe();
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
          .from('profiles').select('*').eq('id', authData.user.id).single();

        // Archive stale open matches
        await supabase.from('matches')
          .update({ status: 'finished' })
          .eq('player1_id', authData.user.id)
          .eq('status', 'active')
          .is('player2_id', null);

        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .insert([{ player1_id: authData.user.id, status: 'active' }])
          .select().single();
        if (matchError) throw matchError;

        set({ profile, match: matchData });

        // Listen for guest joining (requires matches table in Realtime publication)
        supabase
          .channel(`match_listen_${matchData.id}`)
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchData.id}` },
            async (payload) => {
              const updated = payload.new as Match;
              if (updated.player2_id && updated.status === 'active') {
                set({ match: updated });
                await dealCards(updated.id, updated.player1_id, updated.player2_id);
              }
            }
          ).subscribe();
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

      const { data: partnerProfile, error: partnerError } = await supabase
        .from('profiles').select('*').eq('match_code', matchCode.toUpperCase()).single();
      if (partnerError || !partnerProfile) throw new Error('Código inválido o no encontrado');
      if (partnerProfile.id === user.id) throw new Error('No podés emparejarte con vos mismo');

      const { data: existingMatch, error: findMatchError } = await supabase
        .from('matches').select('*')
        .eq('player1_id', partnerProfile.id)
        .is('player2_id', null)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      if (findMatchError || !existingMatch) throw new Error('La partida no está disponible o ya está llena');

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .update({ player2_id: user.id })
        .eq('id', existingMatch.id)
        .select().single();
      if (matchError) throw matchError;

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
