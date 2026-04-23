import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExtendedGameState } from '../store/gameStore';
import {
  CheckCircle2, Heart, Shield, Clock,
  X, History
} from 'lucide-react';

interface BoardProps {
  incomingChallenges: ExtendedGameState[];
  outgoingChallenges: ExtendedGameState[];
  history: ExtendedGameState[];
  currentUserId: string;
  myComodines: ExtendedGameState[]; // in_hand comodines only
  onComplete: (id: string) => void;
  onUseComodin: (challengeId: string, comodin: ExtendedGameState) => Promise<void>;
}



type HistoryItem = ExtendedGameState & { used_comodin?: string };

// Friendly history event label with perspective
function historyLabel(item: HistoryItem, myId: string): string {
  const isMe = item.player_id === myId;

  if (item.card.tipo === 'Comodín') {
    const t = item.card.titulo.toLowerCase();
    if (t.includes('robo')) {
      return isMe ? `Robaste una carta con "${item.card.titulo}"` : `Tu pareja usó "${item.card.titulo}"`;
    }
    return isMe ? `Usaste "${item.card.titulo}"` : `Tu pareja usó "${item.card.titulo}"`;
  }

  if (item.used_comodin) {
    if (item.status === 'bounced') {
      return isMe ? `Rebotaste "${item.card.titulo}" con ${item.used_comodin}` : `Tu pareja te rebotó "${item.card.titulo}" con ${item.used_comodin}`;
    }
    if (item.status === 'discarded') {
      return isMe ? `Vetaste "${item.card.titulo}" con ${item.used_comodin}` : `Tu pareja vetó "${item.card.titulo}" con ${item.used_comodin}`;
    }
  }

  switch (item.status) {
    case 'completed': 
      return isMe ? `Cumpliste "${item.card.titulo}"` : `Tu pareja cumplió "${item.card.titulo}"`;
    case 'discarded': 
      return isMe ? `Vetaste "${item.card.titulo}"` : `Tu pareja vetó "${item.card.titulo}"`;
    case 'bounced':   
      return isMe ? `Rebotaste "${item.card.titulo}"` : `Tu pareja te rebotó "${item.card.titulo}"`;
    default: 
      return item.card.titulo;
  }
}

function historyColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50 border-green-100';
    case 'discarded': return 'text-slate-500 bg-slate-50 border-slate-100';
    case 'bounced':   return 'text-rose-600 bg-rose-50 border-rose-100';
    default: return 'text-slate-800';
  }
}

export default function Board({
  incomingChallenges,
  outgoingChallenges,
  history,
  myComodines,
  currentUserId,
  onComplete,
  onUseComodin,
}: BoardProps) {
  const [comodinModalFor, setComodinModalFor] = useState<ExtendedGameState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleComplete = async (id: string) => {
    setLoadingId(id);
    await onComplete(id);
    setLoadingId(null);
  };

  const handleComodinPick = async (comodin: ExtendedGameState) => {
    if (!comodinModalFor) return;
    setLoadingId(comodinModalFor.id);
    await onUseComodin(comodinModalFor.id, comodin);
    setLoadingId(null);
    setComodinModalFor(null);
  };

  // Detect comodin mechanic from card title
  function comodinType(comodin: ExtendedGameState): 'discarded' | 'bounced' {
    const t = comodin.card.titulo.toLowerCase();
    if (t.includes('espejit') || t.includes('rebotón') || t.includes('rebotar')) return 'bounced';
    return 'discarded'; // veto, negociador, escudo, hoy no
  }

  // PILAR 2 & 4: Group history to handle wildcard usage gracefully
  const historyGroups = new Map<string, ExtendedGameState[]>();
  history.forEach(item => {
    if (!item.resolved_at) return;
    const group = historyGroups.get(item.resolved_at) || [];
    group.push(item);
    historyGroups.set(item.resolved_at, group);
  });

  const filteredHistory = Array.from(historyGroups.values())
    .map(group => {
      const reto = group.find(i => i.card.tipo === 'Reto');
      const comodin = group.find(i => i.card.tipo === 'Comodín');

      if (reto && comodin) {
        // Embed the comodín title into the reto for the label
        return { ...reto, used_comodin: comodin.card.titulo };
      }
      return reto || comodin;
    })
    .filter(Boolean) as HistoryItem[];

  return (
    <div className="w-full px-4 space-y-8 pb-8">
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
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      className="relative group"
                    >
                      {/* Physical Card Representation */}
                      <div 
                        className="rounded-[2.5rem] overflow-hidden border border-rose-100 relative shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1 bg-white"
                      >
                        {/* Subtle romantic watermark */}
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                           <Heart className="w-32 h-32 fill-brand-red" />
                        </div>

                        {/* Urgency Pulse Effect */}
                        <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
                        
                        <div className="p-8 relative z-10">
                          <div className="flex justify-between items-start mb-6">
                            <span className="text-[10px] font-black text-rose-600 tracking-[0.3em] uppercase">
                              {item.card.categoria}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                            </div>
                          </div>

                          <h4 className="text-2xl font-serif font-black text-slate-900 mb-4 leading-tight tracking-tight">
                            {item.card.titulo}
                          </h4>
                          
                          <p className="text-slate-600 text-base leading-relaxed mb-8 font-medium">
                            {item.card.descripcion}
                          </p>

                          <div className="flex flex-col gap-3">
                            {/* Complete Button */}
                            <button
                              onClick={() => handleComplete(item.id)}
                              disabled={!!loadingId}
                              className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-rose-600/20"
                            >
                              {loadingId === item.id
                                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                                : <CheckCircle2 className="w-5 h-5" />
                              }
                              Completar Reto
                            </button>

                            {/* Comodín picker trigger */}
                            <button
                              onClick={() => setComodinModalFor(item)}
                              disabled={myComodines.length === 0 || !!loadingId}
                              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all border border-slate-200"
                            >
                              <Shield className="w-4 h-4" />
                              Usar Comodín {myComodines.length === 0 ? '🔒' : `(${myComodines.length})`}
                            </button>
                          </div>
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
            {/* ── SECCIÓN INFERIOR: HISTORIAL ── */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <History className="w-3 h-3" />
                Historial de Acciones
              </h3>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Heart className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">El historial aparecerá cuando resuelvan retos.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...filteredHistory].reverse().map((item, i) => (
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
                      <p className="text-sm font-medium leading-snug">{historyLabel(item, currentUserId)}</p>
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
            </section>
          </motion.div>

      {/* ── COMODÍN BOTTOM SHEET MODAL ── */}
      <AnimatePresence>
        {comodinModalFor && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setComodinModalFor(null)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-[3rem] bg-white border border-slate-200 border-b-0 overflow-hidden shadow-2xl"
            >
              {/* Handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-slate-200" />
              </div>

              <div className="px-6 pb-2 pt-4 flex justify-between items-center">
                <div>
                  <h3 className="text-slate-900 font-serif font-black text-xl">Elegí tu Comodín</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Contra: <span className="text-rose-600 font-bold">"{comodinModalFor.card.titulo}"</span></p>
                </div>
                <button
                  onClick={() => setComodinModalFor(null)}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 pb-12 pt-2 space-y-3 max-h-[60vh] overflow-y-auto">
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
                        onClick={() => handleComodinPick(comodin)}
                        disabled={!!loadingId}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full text-left border rounded-2xl p-4 transition-all hover:border-white/20 disabled:opacity-40 ${typeColor}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                              <span className="text-slate-900 font-bold text-sm">{comodin.card.titulo}</span>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">{comodin.card.descripcion}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border mt-0.5 ${
                            type === 'bounced'
                              ? 'text-rose-600 bg-rose-50 border-rose-100'
                              : 'text-slate-500 bg-slate-50 border-slate-100'
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
