import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { Settings, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Hand from '../components/Hand';
import Board from '../components/Board';
import confetti from 'canvas-confetti';
import { useNotifications } from '../hooks/useNotifications';

export default function GameScreen() {
  const { signOut, profile, match } = useAuthStore();
  const {
    hand,
    allPlayerCards,
    incomingChallenges,
    outgoingChallenges,
    history,
    isLoading,
    updateCardStatus,
    useComodinAndResolve,
    playStealCard,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);

  useNotifications();

  const handlePlayCard = async (id: string) => {
    const partnerId =
      match?.player1_id === profile?.id ? match?.player2_id : match?.player1_id;
    if (!partnerId || !profile?.id) return;

    const selectedCard = hand.find(c => c.id === id);
    const isSteal = selectedCard?.card.titulo.toLowerCase().includes('robo');

    if (isSteal) {
      // PILAR 1: Robo a Mano Armada - Execute theft logic
      confetti({
        particleCount: 150,
        spread: 100,
        colors: ['#4f46e5', '#818cf8', '#ffffff'],
      });
      await playStealCard(id, profile.id, partnerId);
    } else {
      // Normal challenge play
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.75 },
        colors: ['#D90429', '#ffffff', '#4f46e5'],
      });
      await playCard(id, partnerId);
    }
  };

  const handleUseComodin = async (challengeId: string, comodin: ExtendedGameState) => {
    const partnerId =
      match?.player1_id === profile?.id ? match?.player2_id : match?.player1_id;
    if (partnerId) {
      await useComodinAndResolve(challengeId, comodin, partnerId);
    }
  };

  const handleComplete = async (id: string) => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#22c55e', '#86efac', '#ffffff'],
    });
    await updateCardStatus(id, 'completed');
  };

  // Comodines available for defense (in_hand + tipo Comodín)
  const myComodines = hand.filter((c) => c.card.tipo === 'Comodín');

  const isEmpty =
    !isLoading &&
    allPlayerCards.length === 0 &&
    incomingChallenges.length === 0 &&
    outgoingChallenges.length === 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col max-w-lg mx-auto relative shadow-2xl">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-10%] w-[40%] h-[40%] bg-brand-red/8 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center font-black text-base text-brand-red border border-white/15">
            {profile?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">todoXvos</h1>
            <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">
              {profile?.display_name} · {profile?.match_code}
            </span>
          </div>
        </div>

        {/* Settings menu */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <Settings className="w-4 h-4" />
          </button>

          {showSettings && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowSettings(false)} />
              <div className="absolute right-0 top-11 z-30 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[160px]">
                <button
                  onClick={() => { setShowSettings(false); signOut(); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors font-medium"
                >
                  Abandonar Partida
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col relative z-10 overflow-y-auto pb-8">
        {isLoading && allPlayerCards.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-red mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Cargando partida...</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex-grow flex items-center justify-center text-center px-8">
            <div>
              <p className="text-slate-500 text-sm">Esperando que se repartan las cartas...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Board — La Mesa + Historial */}
            <Board
              incomingChallenges={incomingChallenges}
              outgoingChallenges={outgoingChallenges}
              history={history}
              currentUserId={profile?.id || ''}
              myComodines={myComodines}
              onComplete={handleComplete}
              onUseComodin={handleUseComodin}
            />

            {/* Divider */}
            <div className="mx-6 my-6 border-t border-white/5" />

            {/* Hand section header */}
            <div className="px-6 mb-2 flex justify-between items-baseline">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Mi Mano
              </h2>
              <span className="text-[10px] text-slate-700 font-medium">
                {hand.filter(c => c.card.tipo !== 'Comodín').length} retos · {myComodines.length} comodines
              </span>
            </div>

            {/* Stacked Deck */}
            <Hand
              allCards={allPlayerCards}
              activeHand={hand}
              onPlayCard={handlePlayCard}
            />
          </>
        )}
      </div>
    </div>
  );
}
