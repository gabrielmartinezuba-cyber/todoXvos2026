import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExtendedGameState } from '../store/gameStore';
import {
  CheckCircle2, Sparkles, Shield, Clock,
  ChevronDown, X, History, Layers
} from 'lucide-react';

interface BoardProps {
  incomingChallenges: ExtendedGameState[];
  outgoingChallenges: ExtendedGameState[];
  history: ExtendedGameState[];
  currentUserId: string;
  myComodines: ExtendedGameState[]; // in_hand comodines only
  onComplete: (id: string) => void;
  onUseComodin: (challengeId: string, status: 'discarded' | 'bounced', comodinId: string) => Promise<void>;
}

type Tab = 'activos' | 'historial';

// Friendly history event label
function historyLabel(item: ExtendedGameState): string {
  switch (item.status) {
    case 'completed': return `completó "${item.card.titulo}"`;
    case 'discarded': return `vetó "${item.card.titulo}"`;
    case 'bounced':   return `rebotó "${item.card.titulo}" con Espejito`;
    default: return item.card.titulo;
  }
}

function historyColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'discarded': return 'text-slate-400 bg-white/5 border-white/10';
    case 'bounced':   return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
    default: return 'text-white';
  }
}

export default function Board({
  incomingChallenges,
  outgoingChallenges,
  history,
  myComodines,
  onComplete,
  onUseComodin,
}: BoardProps) {
  const [tab, setTab] = useState<Tab>('activos');
  const [comodinModalFor, setComodinModalFor] = useState<ExtendedGameState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const totalActive = incomingChallenges.length + outgoingChallenges.length;

  const handleComplete = async (id: string) => {
    setLoadingId(id);
    await onComplete(id);
    setLoadingId(null);
  };

  const handleComodinPick = async (comodin: ExtendedGameState, type: 'discarded' | 'bounced') => {
    if (!comodinModalFor) return;
    setLoadingId(comodinModalFor.id);
    await onUseComodin(comodinModalFor.id, type, comodin.id);
    setLoadingId(null);
    setComodinModalFor(null);
  };

  // Detect comodin mechanic from card title
  function comodinType(comodin: ExtendedGameState): 'discarded' | 'bounced' {
    const t = comodin.card.titulo.toLowerCase();
    if (t.includes('espejit') || t.includes('rebotón') || t.includes('robo')) return 'bounced';
    return 'discarded'; // veto, negociador, escudo, hoy no
  }

  return (
    <div className="w-full px-4">

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-6">
        <button
          onClick={() => setTab('activos')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'activos'
              ? 'bg-white/10 text-white shadow-inner'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          La Mesa
          {totalActive > 0 && (
            <span className="bg-brand-red text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {totalActive}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            tab === 'historial'
              ? 'bg-white/10 text-white shadow-inner'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Historial
          {history.length > 0 && (
            <span className="bg-white/10 text-slate-300 text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ── TAB: LA MESA (Active challenges) ── */}
        {tab === 'activos' && (
          <motion.div
            key="activos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Incoming challenges */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse inline-block" />
                Retos Recibidos ({incomingChallenges.length})
                {myComodines.length > 0 && (
                  <span className="ml-auto text-indigo-400 text-[9px]">
                    🛡 {myComodines.length} comodín{myComodines.length > 1 ? 'es' : ''} disponible{myComodines.length > 1 ? 's' : ''}
                  </span>
                )}
              </h3>

              <div className="space-y-3">
                <AnimatePresence>
                  {incomingChallenges.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, x: 60, scale: 0.9 }}
                      className="rounded-3xl overflow-hidden border border-brand-red/20 relative"
                      style={{
                        background: 'radial-gradient(ellipse at top left, rgba(217,4,41,0.12), transparent 60%), rgba(10,10,20,0.7)',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <div className="absolute top-0 right-0 text-[80px] font-black italic text-white/5 leading-none pr-4 pt-2 select-none">!</div>

                      <div className="p-5 relative z-10">
                        <span className="text-[10px] font-black text-brand-red tracking-widest uppercase block mb-1">
                          {item.card.categoria}
                        </span>
                        <h4 className="text-lg font-bold text-white mb-2 leading-tight">{item.card.titulo}</h4>
                        <p className="text-slate-300 text-sm leading-relaxed mb-5">{item.card.descripcion}</p>

                        <div className="flex gap-2 flex-wrap">
                          {/* Complete */}
                          <button
                            onClick={() => handleComplete(item.id)}
                            disabled={!!loadingId}
                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-green-500/20"
                          >
                            {loadingId === item.id
                              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                              : <CheckCircle2 className="w-4 h-4" />
                            }
                            Completar
                          </button>

                          {/* Comodín picker trigger */}
                          <button
                            onClick={() => setComodinModalFor(item)}
                            disabled={myComodines.length === 0 || !!loadingId}
                            className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/35 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                          >
                            <Shield className="w-4 h-4" />
                            Usar Comodín {myComodines.length === 0 && '🔒'}
                            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {incomingChallenges.length === 0 && (
                  <p className="text-slate-600 text-sm italic py-2">No hay retos esperando.</p>
                )}
              </div>
            </section>

            {/* Outgoing challenges */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Retos Enviados ({outgoingChallenges.length})
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {outgoingChallenges.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex justify-between items-center"
                    >
                      <div>
                        <h5 className="text-white font-medium text-sm">{item.card.titulo}</h5>
                        <span className="text-xs text-slate-600">Esperando que cumpla...</span>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {outgoingChallenges.length === 0 && (
                  <p className="text-slate-700 text-sm italic">No enviaste retos todavía.</p>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {/* ── TAB: HISTORIAL ── */}
        {tab === 'historial' && (
          <motion.div
            key="historial"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <History className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">El historial aparece cuando completen o veten un reto.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...history].reverse().map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-start gap-3 border rounded-2xl px-4 py-3 ${historyColor(item.status)}`}
                  >
                    <div className="mt-0.5">
                      {item.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                      {item.status === 'discarded' && <X className="w-4 h-4" />}
                      {item.status === 'bounced'   && <Shield className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{historyLabel(item)}</p>
                      {item.resolved_at && (
                        <p className="text-[10px] opacity-50 mt-0.5">
                          {new Date(item.resolved_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMODÍN BOTTOM SHEET MODAL ── */}
      <AnimatePresence>
        {comodinModalFor && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setComodinModalFor(null)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-3xl bg-slate-900 border border-white/10 border-b-0 overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-6 pb-2 pt-1 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold text-base">Elegí tu Comodín</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Contra: <span className="text-slate-300 font-medium">"{comodinModalFor.card.titulo}"</span></p>
                </div>
                <button
                  onClick={() => setComodinModalFor(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pb-8 pt-2 space-y-2 max-h-[60vh] overflow-y-auto">
                {myComodines.length === 0 ? (
                  <p className="text-center text-slate-600 py-8 text-sm">No tenés comodines disponibles.</p>
                ) : (
                  myComodines.map((comodin) => {
                    const type = comodinType(comodin);
                    const typeLabel = type === 'bounced' ? 'Rebotar' : 'Vetar';
                    const typeColor = type === 'bounced'
                      ? 'border-indigo-500/30 bg-indigo-500/10'
                      : 'border-white/10 bg-white/5';

                    return (
                      <motion.button
                        key={comodin.id}
                        onClick={() => handleComodinPick(comodin, type)}
                        disabled={!!loadingId}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full text-left border rounded-2xl p-4 transition-all hover:border-white/20 disabled:opacity-40 ${typeColor}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-white font-bold text-sm">{comodin.card.titulo}</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">{comodin.card.descripcion}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5 ${
                            type === 'bounced'
                              ? 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30'
                              : 'text-slate-300 bg-white/10 border-white/20'
                          }`}>
                            {typeLabel}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
