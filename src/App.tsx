import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useGameStore } from './store/gameStore';
import AuthScreen from './screens/AuthScreen';
import MatchScreen from './screens/MatchScreen';
import GameScreen from './screens/GameScreen';
import { Loader2 } from 'lucide-react';

function App() {
  const { initialize, isLoading: authLoading, profile, match } = useAuthStore();
  const { subscribeToMatch, unsubscribe, loadGame } = useGameStore();

  // BUG1 FIX: initialize() already calls getSession() and rehydrates match from DB.
  // The second useEffect wires up Realtime and loads cards whenever match + profile are both available,
  // which covers both the first-load and the page-reload case.
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // match.player2_id must be present — means game is fully started
    if (match?.player2_id && profile) {
      loadGame(match.id, profile.id);
      subscribeToMatch(match.id, profile.id);
      return () => unsubscribe();
    }
  }, [match?.id, match?.player2_id, profile?.id]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-brand-red" />
      </div>
    );
  }

  if (!profile) {
    return <AuthScreen />;
  }

  if (!match || !match.player2_id) {
    return <MatchScreen />;
  }

  return <GameScreen />;
}

export default App;
