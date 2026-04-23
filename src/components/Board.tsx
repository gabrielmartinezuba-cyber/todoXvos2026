import { motion, AnimatePresence } from 'framer-motion';
import type { ExtendedGameState } from '../store/gameStore';
import { CheckCircle2, ShieldBan, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface BoardProps {
  pendingCards: ExtendedGameState[];
  currentUserId: string;
  myHand: ExtendedGameState[];
  onComplete: (id: string) => void;
  onUseComodin: (challengeId: string, status: 'discarded' | 'bounced', comodinId: string) => Promise<void>;
}

export default function Board({ pendingCards, currentUserId, myHand, onComplete, onUseComodin }: BoardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const myPending = pendingCards.filter((c) => c.player_id === currentUserId);
  const theirPending = pendingCards.filter((c) => c.player_id !== currentUserId);

  // BUG3 FIX: Resolve which comodines the current player has available in hand
  const availableComodines = myHand.filter((c) => c.card.tipo === 'Comodín' && c.status === 'in_hand');

  // Find specific comodines by their game mechanic (titulo keywords)
  const vetoComodin = availableComodines.find(
    (c) => c.card.titulo.toLowerCase().includes('veto') || c.card.titulo.toLowerCase().includes('absoluto')
  );
  const espejitComodin = availableComodines.find(
    (c) => c.card.titulo.toLowerCase().includes('espejit') || c.card.titulo.toLowerCase().includes('rebotón')
  );
  // Any comodin can be used as a generic veto if specific ones aren't available
  const anyComodin = availableComodines[0];

  const handleComodinAction = async (challengeId: string, status: 'discarded' | 'bounced') => {
    const comodinToUse = status === 'bounced'
      ? (espejitComodin ?? anyComodin)
      : (vetoComodin ?? anyComodin);

    if (!comodinToUse) return; // Button should be disabled already — safety guard

    setLoadingId(challengeId + status);
    await onUseComodin(challengeId, status, comodinToUse.id);
    setLoadingId(null);
  };

  const handleComplete = async (id: string) => {
    setLoadingId(id + 'completed');
    await onComplete(id);
    setLoadingId(null);
  };

  const hasAnyComodin = availableComodines.length > 0;

  return (
    <div className="w-full px-6 space-y-8">

      {/* Retos Recibidos */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
          Retos Recibidos ({myPending.length})
          {hasAnyComodin && (
            <span className="ml-auto text-indigo-400 text-[10px] font-bold tracking-widest">
              🛡 {availableComodines.length} comodín{availableComodines.length > 1 ? 'es' : ''} disponible{availableComodines.length > 1 ? 's' : ''}
            </span>
          )}
        </h2>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {myPending.map((item) => {
              const isVetoLoading = loadingId === item.id + 'discarded';
              const isEspejitLoading = loadingId === item.id + 'bounced';
              const isCompleteLoading = loadingId === item.id + 'completed';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 100 }}
                  className="bg-brand-red/10 border border-brand-red/20 p-6 rounded-3xl relative overflow-hidden backdrop-blur-md"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="text-8xl font-black italic">!</span>
                  </div>

                  <div className="relative z-10">
                    <span className="text-xs font-bold text-brand-red tracking-widest uppercase mb-2 block">
                      {item.card.categoria}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">{item.card.titulo}</h3>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">{item.card.descripcion}</p>

                    <div className="flex flex-wrap gap-2">
                      {/* Complete — always available */}
                      <button
                        onClick={() => handleComplete(item.id)}
                        disabled={!!loadingId}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95 shadow-lg shadow-green-500/20"
                      >
                        {isCompleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Completar
                      </button>

                      {/* Veto — only if player has a comodin */}
                      <button
                        onClick={() => handleComodinAction(item.id, 'discarded')}
                        disabled={!hasAnyComodin || !!loadingId}
                        title={hasAnyComodin ? 'Usar comodín para vetar' : 'No tenés comodines disponibles'}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95"
                      >
                        {isVetoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldBan className="w-4 h-4" />}
                        Vetar {!hasAnyComodin && '🔒'}
                      </button>

                      {/* Espejito — only if player has a comodin */}
                      <button
                        onClick={() => handleComodinAction(item.id, 'bounced')}
                        disabled={!hasAnyComodin || !!loadingId}
                        title={hasAnyComodin ? 'Usar comodín Espejito' : 'No tenés comodines disponibles'}
                        className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95"
                      >
                        {isEspejitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Espejito {!hasAnyComodin && '🔒'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {myPending.length === 0 && (
            <div className="text-slate-500 text-sm italic">
              No tenés retos pendientes por ahora.
            </div>
          )}
        </div>
      </section>

      {/* Retos Enviados */}
      <section>
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">
          Retos Enviados ({theirPending.length})
        </h2>
        <div className="space-y-3">
          <AnimatePresence>
            {theirPending.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center"
              >
                <div>
                  <h4 className="text-white font-medium text-sm">{item.card.titulo}</h4>
                  <span className="text-xs text-slate-500">Esperando respuesta...</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
