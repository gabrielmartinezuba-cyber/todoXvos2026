import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import type { ExtendedGameState } from '../store/gameStore';

export function useNotifications() {
  const { incomingChallenges } = useGameStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!profile || incomingChallenges.length === 0) return;

    // Find a challenge that we haven't notified about yet
    const newChallenge = incomingChallenges.find(
      (card: ExtendedGameState) => !localStorage.getItem(`notified_${card.id}`)
    );

    if (newChallenge) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('¡Nueva carta de todoXvos!', {
          body: `Tu pareja te jugó: ${newChallenge.card?.titulo}`,
          icon: '/pwa-192x192.png',
        });
      }
      localStorage.setItem(`notified_${newChallenge.id}`, 'true');
    }
  }, [incomingChallenges, profile]);
}
