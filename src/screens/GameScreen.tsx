import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { LogOut, Loader2 } from 'lucide-react';
import Hand from '../components/Hand';
import Board from '../components/Board';
import confetti from 'canvas-confetti';
import { useNotifications } from '../hooks/useNotifications';

export default function GameScreen() {
  const { signOut, profile, match } = useAuthStore();
  const { hand, board, allPlayerCards, isLoading, playCard, updateCardStatus, useComodinAndResolve } = useGameStore();

  useNotifications();

  const handlePlayCard = async (id: string) => {
    const partnerId = match?.player1_id === profile?.id ? match?.player2_id : match?.player1_id;
    if (partnerId) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#D90429', '#ffffff', '#4f46e5']
      });
      await playCard(id, partnerId);
    }
  };

  const handleComplete = async (id: string) => {
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.5 },
      colors: ['#22c55e', '#86efac', '#ffffff']
    });
    await updateCardStatus(id, 'completed');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col page-enter-active max-w-lg mx-auto relative shadow-2xl">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-red/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="flex justify-between items-center p-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-brand-red border border-white/20">
            {profile?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter leading-tight">todoXvos</h1>
            <span className="text-xs text-slate-500 font-medium">Match: {profile?.match_code}</span>
          </div>
        </div>
        <button
          onClick={signOut}
          title="Abandonar partida"
          className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 active:scale-90"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-grow flex flex-col relative z-10 overflow-y-auto pb-6">
        {isLoading && board.length === 0 && hand.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
          </div>
        ) : (
          <>
            <Board
              pendingCards={board}
              currentUserId={profile?.id || ''}
              myHand={hand}
              onComplete={handleComplete}
              onUseComodin={useComodinAndResolve}
            />

            <div className="mt-8 border-t border-white/5 pt-8">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest px-6 mb-2">
                Mi Mano ({hand.filter(c => c.card.tipo !== 'Comodín').length} retos · {hand.filter(c => c.card.tipo === 'Comodín').length} comodines)
              </h2>
              <Hand cards={allPlayerCards} onPlayCard={handlePlayCard} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
