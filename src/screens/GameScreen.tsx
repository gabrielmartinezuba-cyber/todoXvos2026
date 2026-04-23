import { useAuthStore } from '../store/authStore';
import { useGameStore, type ExtendedGameState } from '../store/gameStore';
import { Settings, Loader2, Heart, BellRing } from 'lucide-react';
import { useState, useEffect } from 'react';
import Hand from '../components/Hand';
import Board from '../components/Board';
import confetti from 'canvas-confetti';
import { useNotifications } from '../hooks/useNotifications';

export default function GameScreen() {
  const { signOut, profile, match, subscribeToPushNotifications } = useAuthStore();
  const {
    hand,
    allPlayerCards,
    incomingChallenges,
    outgoingChallenges,
    history,
    isLoading,
    playCard,
    updateCardStatus,
    useComodinAndResolve,
    playStealCard,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [mainTab, setMainTab] = useState<'actividad' | 'cartas'>('actividad');
  const [pushStatus, setPushStatus] = useState<string>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    const success = await subscribeToPushNotifications();
    if (success && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }
    setIsSubscribing(false);
  };

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
    <div className="min-h-screen bg-cream text-slate-800 flex flex-col max-w-lg mx-auto relative shadow-2xl overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-rose-100/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="px-6 py-5 relative z-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-black text-lg text-brand-red border border-rose-100 shadow-sm">
            {profile?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-serif font-black tracking-tight leading-none text-slate-900">todoXvos</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {profile?.display_name}
            </span>
          </div>
        </div>

        {/* Settings menu - absolute positioned */}
        <div className="absolute top-5 right-6 z-50">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-2xl bg-white border border-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90 shadow-sm"
          >
            <Settings className="w-4 h-4" />
          </button>

          {showSettings && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
              <div className="absolute right-0 top-12 z-50 bg-white border border-rose-100 rounded-2xl shadow-2xl overflow-hidden min-w-[180px]">
                <button
                  onClick={() => { setShowSettings(false); signOut(); }}
                  className="w-full text-left px-5 py-4 text-sm text-red-500 hover:bg-rose-50 transition-colors font-bold uppercase tracking-wider"
                >
                  Abandonar Partida
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col relative z-10 overflow-y-auto pb-8 pt-4">
        
        {/* Main Tabs Navigation */}
        <div className="px-6 mb-6">
          <div className="flex gap-1.5 bg-slate-100/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
            <button
              onClick={() => setMainTab('actividad')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                mainTab === 'actividad'
                  ? 'bg-white text-rose-600 shadow-md border border-rose-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
              }`}
            >
              <BellRing className="w-4 h-4" />
              Actividad
            </button>
            <button
              onClick={() => setMainTab('cartas')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                mainTab === 'cartas'
                  ? 'bg-white text-rose-600 shadow-md border border-rose-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
              }`}
            >
              <Heart className="w-4 h-4" />
              Cartas
            </button>
          </div>
        </div>

        {isLoading && allPlayerCards.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-red mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Cargando partida...</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex-grow flex items-center justify-center text-center px-8">
            <div className="max-w-xs">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <Heart className="w-6 h-6 text-rose-300 animate-pulse" />
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">Esperando que se repartan las cartas para empezar la magia...</p>
            </div>
          </div>
        ) : (
          <>
            {mainTab === 'actividad' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Push Notifications Banner */}
                {pushStatus === 'default' && (
                  <div className="mx-6 mb-4 bg-white border border-rose-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <BellRing className="w-4 h-4 text-brand-red" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Notificaciones</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Enterate al instante cuando tu pareja juegue.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleEnablePush}
                      disabled={isSubscribing}
                      className="bg-brand-red hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                    >
                      {isSubscribing ? 'Activando...' : 'Activar'}
                    </button>
                  </div>
                )}

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
              </div>
            )}

            {mainTab === 'cartas' && (
              <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500 h-full">
                <Hand
                  allCards={allPlayerCards}
                  activeHand={hand}
                  onPlayCard={handlePlayCard}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
