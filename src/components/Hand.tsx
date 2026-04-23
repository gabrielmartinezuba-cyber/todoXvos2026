import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import type { ExtendedGameState } from '../store/gameStore';
import { CheckCircle2, Clock, ShieldOff } from 'lucide-react';

interface HandProps {
  cards: ExtendedGameState[];
  onPlayCard: (id: string) => void;
}

// Map status → visual state config
const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  dimmed: boolean;
}> = {
  in_hand: { label: '', icon: null, dimmed: false },
  pending:  { label: 'Enviada',   icon: <Clock className="w-3 h-3" />,       dimmed: true },
  completed:{ label: 'Cumplida',  icon: <CheckCircle2 className="w-3 h-3" />, dimmed: true },
  discarded:{ label: 'Vetada',    icon: <ShieldOff className="w-3 h-3" />,    dimmed: true },
  bounced:  { label: 'Espejito',  icon: <ShieldOff className="w-3 h-3" />,    dimmed: true },
};

export default function Hand({ cards, onPlayCard }: HandProps) {
  const [activeCard, setActiveCard] = useState<ExtendedGameState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });

  useEffect(() => {
    const updateConstraints = () => {
      if (containerRef.current && innerRef.current) {
        const innerWidth = innerRef.current.scrollWidth;
        const containerWidth = containerRef.current.offsetWidth;
        if (innerWidth > containerWidth) {
          setConstraints({ right: 0, left: -(innerWidth - containerWidth + 48) });
        } else {
          setConstraints({ left: 0, right: 0 });
        }
      }
    };
    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [cards.length]);

  const controls = useAnimation();
  const isComodin = (item: ExtendedGameState) => item.card.tipo === 'Comodín';
  const isActive   = (item: ExtendedGameState) => item.status === 'in_hand';

  const handleDragEnd = async (_event: any, info: any) => {
    if (!activeCard) return;

    // Blocked: comodines and already-used cards spring back
    if (isComodin(activeCard) || !isActive(activeCard)) {
      controls.start({ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 400 } });
      return;
    }

    if (info.offset.y < -60) {
      await controls.start({
        y: -1200,
        opacity: 0,
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
      });
      onPlayCard(activeCard.id);
      setActiveCard(null);
    } else {
      controls.start({ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } });
    }
  };

  // Sort: in_hand first, then the rest (cemetery at the end)
  const sorted = [...cards].sort((a, b) => {
    if (a.status === 'in_hand' && b.status !== 'in_hand') return -1;
    if (a.status !== 'in_hand' && b.status === 'in_hand') return 1;
    return 0;
  });

  return (
    <>
      {/* Carousel */}
      <div className="w-full overflow-hidden" ref={containerRef}>
        <motion.div
          ref={innerRef}
          drag="x"
          dragConstraints={constraints}
          dragElastic={0.1}
          className="flex gap-3 pb-12 pt-4 px-6 w-max cursor-grab active:cursor-grabbing"
        >
          {sorted.map((item) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.in_hand;
            const cardIsComodin = isComodin(item);
            const active = isActive(item);
            const accentColor = cardIsComodin ? 'text-indigo-400' : 'text-brand-red';

            return (
              <motion.div
                key={item.id}
                layoutId={`card-${item.id}`}
                onClick={() => {
                  // Only expandable if still in hand
                  if (active) setActiveCard(item);
                }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{
                  opacity: activeCard?.id === item.id ? 0 : cfg.dimmed ? 0.35 : 1,
                  scale: cfg.dimmed ? 0.93 : 1,
                  filter: cfg.dimmed ? 'grayscale(0.75)' : 'grayscale(0)',
                }}
                transition={{ duration: 0.3 }}
                className={`
                  bg-white/5 backdrop-blur-xl border rounded-3xl p-5 relative w-60 h-76 flex flex-col justify-between shrink-0 overflow-hidden
                  ${active ? 'border-white/20 cursor-pointer hover:border-white/35 transition-colors' : 'border-white/5 cursor-default pointer-events-none'}
                  ${activeCard?.id === item.id ? 'pointer-events-none' : ''}
                `}
              >
                {/* Background orb — muted when dimmed */}
                <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full mix-blend-multiply filter blur-3xl transition-opacity duration-500 ${cardIsComodin ? 'bg-indigo-500' : 'bg-brand-red'} ${cfg.dimmed ? 'opacity-0' : 'opacity-20'}`} />

                {/* Status badge overlay */}
                {cfg.dimmed && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 border border-white/10 text-white/50 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {cfg.icon}
                    {cfg.label}
                  </div>
                )}

                {/* Comodín badge */}
                {cardIsComodin && active && (
                  <div className="absolute top-3 right-3 bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Comodín
                  </div>
                )}

                <div className="relative z-10 mt-6">
                  <div className={`text-[10px] font-black tracking-[0.2em] uppercase mb-3 ${cfg.dimmed ? 'text-slate-600' : accentColor}`}>
                    {item.card.categoria}
                  </div>
                  <h3 className={`text-lg font-bold leading-tight mb-2 ${cfg.dimmed ? 'text-slate-500' : 'text-white'}`}>
                    {item.card.titulo}
                  </h3>
                  <p className={`text-xs line-clamp-3 mt-2 ${cfg.dimmed ? 'text-slate-700' : 'text-slate-400'}`}>
                    {item.card.descripcion}
                  </p>
                </div>

                <div className={`relative z-10 text-[9px] uppercase tracking-widest font-bold mt-2 ${cfg.dimmed ? 'text-slate-700' : cardIsComodin ? 'text-indigo-500/60' : 'text-slate-600'}`}>
                  {cfg.dimmed ? '' : cardIsComodin ? '🛡 Solo para defensa' : '↑ Tocá para expandir'}
                </div>
              </motion.div>
            );
          })}

          {cards.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-3xl mx-6" style={{ minWidth: 'calc(100vw - 3rem)' }}>
              <span className="text-sm tracking-widest uppercase mb-2">Mano Vacía</span>
              <span className="text-xs">Esperando cartas...</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Expanded Card Overlay — only for in_hand cards */}
      <AnimatePresence>
        {activeCard && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-0">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
              onClick={() => setActiveCard(null)}
            />

            <motion.div
              layoutId={`card-${activeCard.id}`}
              drag="y"
              dragConstraints={{ top: -20, bottom: 80 }}
              onDragEnd={handleDragEnd}
              animate={controls}
              className="w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[2rem] p-8 relative overflow-hidden flex flex-col z-10"
              style={{ minHeight: '55vh' }}
            >
              <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full filter blur-3xl opacity-30 ${isComodin(activeCard) ? 'bg-indigo-500' : 'bg-brand-red'}`} />

              <div className="relative z-10 flex-grow flex flex-col">
                <motion.div layout className={`text-xs font-black tracking-[0.2em] uppercase mb-3 ${isComodin(activeCard) ? 'text-indigo-400' : 'text-brand-red'}`}>
                  {activeCard.card.categoria}
                </motion.div>
                <motion.h3 layout className="text-3xl font-bold text-white mb-6 leading-tight">
                  {activeCard.card.titulo}
                </motion.h3>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <p className="text-slate-200 leading-relaxed text-base">{activeCard.card.descripcion}</p>
                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-center text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Tipo: {activeCard.card.tipo}
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative z-10 mt-6 pt-5 border-t border-white/10 flex justify-center"
              >
                {isComodin(activeCard) ? (
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
                    <span>🛡</span>
                    <span>Usalo para defenderte de un Reto</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-1.5 h-1.5 bg-white rounded-full"
                    />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-300">
                      Swipe Up to Play
                    </span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
