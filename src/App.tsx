import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useGameStore } from './store/gameStore';
import AuthScreen from './screens/AuthScreen';
import MatchScreen from './screens/MatchScreen';
import GameScreen from './screens/GameScreen';
import { Loader2 } from 'lucide-react';

function App() {
  const initialize = useAuthStore(state => state.initialize);
  const profile = useAuthStore(state => state.profile);
  const match = useAuthStore(state => state.match);
  const authLoading = useAuthStore(state => state.isLoading);

  const loadGame = useGameStore(state => state.loadGame);
  const subscribeToMatch = useGameStore(state => state.subscribeToMatch);
  const unsubscribe = useGameStore(state => state.unsubscribe);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Wire up Realtime + initial load as soon as the match is fully paired.
    // This fires for BOTH players:
    //   - Guest: fired immediately when joinMatch() sets match (player2_id is already present)
    //   - Host: fired when the Realtime UPDATE arrives and authStore sets the updated match
    // The subscription listens to INSERT/UPDATE on game_state, so even if loadGame()
    // returns 0 cards (Host hasn't dealt yet), it will re-run the moment cards are inserted.
    if (match?.player2_id && profile?.id) {
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

  // Both players go straight to GameScreen — even if game_state is still empty.
  // GameScreen handles the "waiting for cards" state gracefully.
  return <GameScreen />;
}

export default App;
