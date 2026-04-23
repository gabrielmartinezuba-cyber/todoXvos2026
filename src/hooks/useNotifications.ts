import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
  const { board } = useGameStore();
  const { profile } = useAuthStore();

  useEffect(() => {
    // Request permission on mount
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Simulate push notification when a new card is pending for the user
    if (!profile) return;
    
    // Find a card that was just played targeting me
    const pendingForMe = board.find(
      card => card.player_id === profile.id && card.status === 'pending'
    );

    if (pendingForMe) {
      // Basic debounce or check so we don't spam. In a real app we'd use a real push service.
      // But for this simulation, we'll just check if we haven't shown it recently.
      const lastShown = localStorage.getItem(`notified_${pendingForMe.id}`);
      
      if (!lastShown) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('¡Nueva carta de todoXvos!', {
            body: `Tu pareja te jugó: ${pendingForMe.card?.titulo}`,
            icon: '/pwa-192x192.png'
          });
        }
        localStorage.setItem(`notified_${pendingForMe.id}`, 'true');
      }
    }
  }, [board, profile]);
}
