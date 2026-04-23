import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExtendedGameState } from '../store/gameStore';
import { ChevronLeft, ChevronRight, Zap, Shield, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface HandProps {
  /** Full original inventory (all 25 cards, active and used) */
  allCards: ExtendedGameState[];
  /** Active hand (in_hand only) — controls what can be played */
  activeHand: ExtendedGameState[];
  onPlayCard: (id: string) => void;
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending:   { label: 'Enviada',  icon: <Clock className="w-3.5 h-3.5" />,      color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  completed: { label: 'Cumplida', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  discarded: { label: 'Vetada',   icon: <XCircle className="w-3.5 h-3.5" />,     color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  bounced:   { label: 'Espejito', icon: <Shield className="w-3.5 h-3.5" />,      color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
};

export default function Hand({ allCards, activeHand, onPlayCard }: HandProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const handlePlay = async () => {
    if (!isActive || (isComodin && !isSteal) || isPlaying) return;
    setIsPlaying(true);
    await onPlayCard(card.id);
    setIsPlaying(false);
    // Move to next available card
    if (safeIndex >= total - 1) setCurrentIndex(Math.max(0, safeIndex - 1));
  };

  const accentColor = isComodin ? '#6366f1' : '#D90429';
  const accentClass = isComodin ? 'text-indigo-400' : 'text-brand-red';
  const borderClass = isComodin ? 'border-indigo-500/30' : 'border-brand-red/20';
  const glowClass   = isComodin ? 'bg-indigo-500/15' : 'bg-brand-red/10';

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
              className="absolute w-full max-w-xs rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md"
              style={{
                height: 340,
                transform: `translateY(${depth * -10}px) scale(${1 - depth * 0.04})`,
                zIndex: 10 - depth,
                opacity: 0.5 - depth * 0.1,
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
            className={`absolute w-full max-w-xs rounded-3xl overflow-hidden border backdrop-blur-xl z-20
              ${isActive ? borderClass : 'border-white/5'}
              ${isActive ? '' : 'opacity-40 grayscale-[0.7]'}
            `}
            style={{
              height: 340,
              background: isActive
                ? `radial-gradient(ellipse at top right, ${accentColor}22, transparent 60%), rgba(15,15,25,0.85)`
                : 'rgba(15,15,25,0.6)',
              boxShadow: isActive
                ? `0 0 40px ${accentColor}20, inset 0 0 0 1px ${accentColor}20`
                : 'none',
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
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3" /> Comodín
              </div>
            )}

            <div className="p-7 flex flex-col h-full">
              {/* Category */}
              <span className={`text-[10px] font-black tracking-[0.2em] uppercase mb-4 block ${isActive ? accentClass : 'text-slate-600'}`}>
                {card.card.categoria}
              </span>

              {/* Title */}
              <h3 className={`text-2xl font-bold leading-tight mb-4 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {card.card.titulo}
              </h3>

              {/* Description */}
              <p className={`text-sm leading-relaxed flex-grow ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                {card.card.descripcion}
              </p>

              {/* Tipo pill */}
              <div className={`mt-4 text-[10px] uppercase tracking-widest font-bold ${isActive ? accentClass : 'text-slate-700'}`}>
                {isActive
                  ? isSteal 
                    ? '⚡ Acción Especial: Robar Carta'
                    : isComodin 
                    ? '🛡 Solo para defensa' 
                    : '↓ Usá el botón para jugar'
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
          className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Play Button — only for active reto cards */}
        <motion.button
          onClick={handlePlay}
          disabled={!isActive || (isComodin && !isSteal) || isPlaying}
          whileTap={isActive && (!isComodin || isSteal) ? { scale: 0.95 } : {}}
          className={`flex-1 h-11 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all
            ${isActive && (!isComodin || isSteal)
              ? isSteal 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 cursor-pointer'
                : 'bg-brand-red text-white shadow-lg shadow-brand-red/30 hover:bg-red-600 cursor-pointer'
              : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
            }
          `}
        >
          {isPlaying ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {isSteal ? 'Robar Carta' : isComodin ? 'Comodín (Defensa)' : !isActive ? 'Carta Usada' : 'Jugar Carta'}
            </>
          )}
        </motion.button>

        <button
          onClick={() => goTo(1)}
          disabled={safeIndex === total - 1}
          className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
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
                ? 'w-4 h-2 bg-white'
                : c.status === 'in_hand'
                ? 'w-2 h-2 bg-white/30'
                : 'w-2 h-2 bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
