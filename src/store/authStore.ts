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
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        if (profileData) set({ profile: profileData });

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
          
          supabase
            .channel(`match_update_${matchData.id}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchData.id}` },
              (payload) => {
                const updatedMatch = payload.new as Match;
                if (updatedMatch.player2_id && updatedMatch.status === 'active') {
                  set({ match: updatedMatch });
                }
              }
            )
            .subscribe();
        }
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null });
      if (!session) {
        get().reset();
      }
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

        // Clean up any old active matches where this user was player1
        await supabase
          .from('matches')
          .update({ status: 'finished' })
          .eq('player1_id', authData.user.id)
          .eq('status', 'active');

        // Host creates the match immediately with player2_id = null
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .insert([{ player1_id: authData.user.id, status: 'active' }])
          .select()
          .single();
          
        if (matchError) throw matchError;

        set({ profile, match: matchData });

        supabase
          .channel(`match_update_${matchData.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchData.id}` },
            (payload) => {
              const updatedMatch = payload.new as Match;
              if (updatedMatch.player2_id && updatedMatch.status === 'active') {
                set({ match: updatedMatch });
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

      const { data: partnerProfile, error: partnerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('match_code', matchCode.toUpperCase())
        .single();

      if (partnerError || !partnerProfile) throw new Error('Código inválido o no encontrado');
      if (partnerProfile.id === user.id) throw new Error('No podés emparejarte con vos mismo');

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

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .update({ player2_id: user.id })
        .eq('id', existingMatch.id)
        .select()
        .single();

      if (matchError) throw matchError;

      const { data: cards } = await supabase.from('cards').select('*');
      if (cards && cards.length === 50) {
        const shuffled = [...cards].sort(() => 0.5 - Math.random());
        const retos = shuffled.filter(c => c.tipo === 'Reto');
        const comodines = shuffled.filter(c => c.tipo === 'Comodín');
        
        const cardAssignments = [];
        for(let i=0; i<22; i++) {
          cardAssignments.push({ match_id: matchData.id, card_id: retos[i].id, player_id: partnerProfile.id, status: 'in_hand' });
          cardAssignments.push({ match_id: matchData.id, card_id: retos[i+22].id, player_id: user.id, status: 'in_hand' });
        }
        for(let i=0; i<3; i++) {
          cardAssignments.push({ match_id: matchData.id, card_id: comodines[i].id, player_id: partnerProfile.id, status: 'in_hand' });
          cardAssignments.push({ match_id: matchData.id, card_id: comodines[i+3].id, player_id: user.id, status: 'in_hand' });
        }

        await supabase.from('game_state').insert(cardAssignments);
      }

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
  }
}));
