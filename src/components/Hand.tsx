import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, type ExtendedGameState } from '../store/gameStore';
import { ChevronLeft, ChevronRight, Zap, Heart, Clock, CheckCircle2, XCircle, Shield } from 'lucide-react';

interface HandProps {
  /** Full original inventory (all 25 cards, active and used) */
  allCards: ExtendedGameState[];
  /** Active hand (in_hand only) — controls what can be played */
  activeHand: ExtendedGameState[];
  onPlayCard: (id: string) => void;
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending:   { label: 'Enviada',  icon: <Clock className="w-3.5 h-3.5" />,      color: 'text-amber-600 bg-amber-50 border-amber-100' },
  completed: { label: 'Cumplida', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-600 bg-green-50 border-green-100' },
  discarded: { label: 'Vetada',   icon: <XCircle className="w-3.5 h-3.5" />,     color: 'text-slate-500 bg-slate-50 border-slate-100' },
  bounced:   { label: 'Espejito', icon: <Shield className="w-3.5 h-3.5" />,      color: 'text-rose-600 bg-rose-50 border-rose-100' },
};

export default function Hand({ allCards, activeHand, onPlayCard }: HandProps) {
  const { incomingChallenges, outgoingChallenges } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // PILAR C: Pacing Rules
  const isBlockedByIncoming = incomingChallenges.length > 0;
  const isSpamming = outgoingChallenges.length > 0;

  // Sort: active first, used at the end (cemetery)
  const sorted = [...allCards].sort((a, b) => {
    if (a.status === 'in_hand' && b.status !== 'in_hand') return -1;
    if (a.status !== 'in_hand' && b.status === 'in_hand') return 1;
    // Comodines last within active
    if (a.card.tipo === 'Comodín' && b.card.tipo !== 'Comodín') return 1;
    if (a.card.tipo !== 'Comodín' && b.card.tipo === 'Comodín') return -1;
    return 0;
  });

  const total = sorted.length;
  const safeIndex = Math.min(currentIndex, total - 1);
  const card = sorted[safeIndex];

  if (!card) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-600 text-sm">
        No hay cartas en tu mano.
      </div>
    );
  }

  const isActive = card.status === 'in_hand';
  const isComodin = card.card.tipo === 'Comodín';
  const isSteal = card.card.titulo.toLowerCase().includes('robo');
  const meta = STATUS_META[card.status];

  const goTo = (dir: 1 | -1) => {
    setCurrentIndex(prev => Math.min(Math.max(0, prev + dir), total - 1));
  };

  const isPacingBlocked = !isComodin && (isBlockedByIncoming || isSpamming);
  const canPlay = isActive && (!isComodin || isSteal) && !isPlaying && !isPacingBlocked;

  const handlePlay = async () => {
    if (!canPlay) return;
    setIsPlaying(true);
    await onPlayCard(card.id);
    setIsPlaying(false);
    // Move to next available card
    if (safeIndex >= total - 1) setCurrentIndex(Math.max(0, safeIndex - 1));
  };

  const accentColor = isComodin ? '#E11D48' : '#D32F2F';
  const accentClass = isComodin ? 'text-rose-600' : 'text-brand-red';
  const borderClass = isComodin ? 'border-rose-200' : 'border-rose-100';
  const glowClass   = isComodin ? 'bg-rose-500/5' : 'bg-brand-red/5';

  return (
    <div className="w-full flex flex-col items-center gap-5 px-4 pt-4 pb-6 select-none">
      {/* Counter */}
      <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
        {safeIndex + 1} / {total} · {activeHand.length} activas
      </div>

      {/* Stacked Deck */}
      <div className="relative w-full max-w-xs flex items-center justify-center" style={{ height: 380 }}>
        {/* Back cards (depth effect) */}
        {[2, 1].map((depth) => {
          const deckIndex = safeIndex + depth;
          if (deckIndex >= total) return null;
            return (
              <div
                key={`back-${depth}`}
                className="absolute w-full max-w-xs rounded-[2.5rem] bg-white border border-slate-100 shadow-sm"
                style={{
                  height: 340,
                  transform: `translateY(${depth * -10}px) scale(${1 - depth * 0.04})`,
                  zIndex: 10 - depth,
                  opacity: 0.6 - depth * 0.15,
                }}
              />
            );
        })}

        {/* Main Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`absolute w-full max-w-xs rounded-[2.5rem] overflow-hidden border backdrop-blur-xl z-20 shadow-2xl
              ${isActive ? borderClass : 'border-slate-100'}
              ${isActive ? '' : 'opacity-40 grayscale-[0.6]'}
            `}
            style={{
              height: 340,
              background: isActive
                ? `radial-gradient(ellipse at top right, ${accentColor}11, transparent 60%), #FFFFFF`
                : '#F9FAFB',
            }}
          >
            {/* Status badge for used cards */}
            {!isActive && meta && (
              <div className={`absolute top-4 right-4 flex items-center gap-1.5 border text-xs font-bold px-3 py-1 rounded-full ${meta.color}`}>
                {meta.icon} {meta.label}
              </div>
            )}

            {/* Comodín badge */}
            {isActive && isComodin && (
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                <Heart className="w-3 h-3 fill-rose-600" /> Comodín
              </div>
            )}

            <div className="p-7 flex flex-col h-full">
              {/* Category */}
              <span className={`text-[10px] font-black tracking-[0.2em] uppercase mb-4 block ${isActive ? accentClass : 'text-slate-600'}`}>
                {card.card.categoria}
              </span>

              {/* Title */}
              <h3 className={`text-2xl font-serif font-black leading-tight mb-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                {card.card.titulo}
              </h3>

              {/* Description */}
              <p className={`text-sm leading-relaxed flex-grow font-medium ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                {card.card.descripcion}
              </p>

              {/* Tipo pill */}
              <div className={`mt-4 text-[10px] uppercase tracking-widest font-black ${isActive ? accentClass : 'text-slate-300'}`}>
                {isActive
                  ? isSteal 
                    ? '⚡ Acción: Robar Carta'
                    : isComodin 
                    ? '🛡 Solo defensa' 
                    : '↓ Deslizá hacia arriba'
                  : ''
                }
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Glow for active card */}
        {isActive && (
          <div className={`absolute inset-0 rounded-3xl pointer-events-none z-10 ${glowClass} blur-3xl scale-75 opacity-30`} />
        )}
      </div>

      {/* Navigation Row */}
      <div className="flex items-center gap-4 w-full max-w-xs">
        <button
          onClick={() => goTo(-1)}
          disabled={safeIndex === 0}
          className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Play Button Container */}
        <div className="flex-1 flex flex-col items-center">
          <motion.button
            onClick={handlePlay}
            disabled={!canPlay}
            whileTap={canPlay ? { scale: 0.95 } : {}}
            className={`w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg
              ${canPlay
                ? isSteal 
                  ? 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600 cursor-pointer'
                  : 'bg-brand-red text-white shadow-brand-red/20 hover:bg-red-700 cursor-pointer'
                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }
            `}
          >
            {isPlaying ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
              />
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                {isSteal ? 'Robar Carta' : isComodin ? 'Comodín' : !isActive ? 'Carta Usada' : 'Jugar Carta'}
              </>
            )}
          </motion.button>
          
          {/* Pacing Helper Text */}
          {isActive && !isComodin && isBlockedByIncoming && (
            <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-2 text-center leading-tight">
              Resolvé el reto<br/>recibido primero
            </span>
          )}
          {isActive && !isComodin && !isBlockedByIncoming && isSpamming && (
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2 text-center leading-tight">
              Esperando que tu pareja<br/>cumpla tu reto
            </span>
          )}
        </div>

        <button
          onClick={() => goTo(1)}
          disabled={safeIndex === total - 1}
          className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
        {sorted.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setCurrentIndex(i)}
            className={`rounded-full transition-all ${
              i === safeIndex
                ? 'w-4 h-1.5 bg-rose-600'
                : c.status === 'in_hand'
                ? 'w-1.5 h-1.5 bg-rose-200'
                : 'w-1.5 h-1.5 bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
