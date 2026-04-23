import { useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import type { ExtendedGameState } from '../store/gameStore';
import { Heart } from 'lucide-react';

interface CardProps {
  item: ExtendedGameState;
  onPlay: (id: string) => void;
}

export default function Card({ item, onPlay }: CardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const controls = useAnimation();

  const handleDragEnd = async (_event: any, info: any) => {
    const swipeThreshold = -50; // swipe up
    if (info.offset.y < swipeThreshold) {
      // Animate card flying away
      await controls.start({
        y: -500,
        opacity: 0,
        transition: { duration: 0.3, ease: 'easeOut' }
      });
      onPlay(item.id);
    } else {
      // Snap back
      controls.start({ y: 0, opacity: 1 });
    }
  };

  const isComodin = item.card.tipo === 'Comodín';
  const accentColor = isComodin ? 'text-rose-600' : 'text-brand-red';
  const glowColor = isComodin ? 'shadow-rose-500/10' : 'shadow-brand-red/10';

  return (
    <motion.div
      layoutId={`card-${item.id}`}
      drag={isExpanded ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      onClick={() => setIsExpanded(!isExpanded)}
      className={`relative cursor-pointer shrink-0 snap-center select-none w-64 ${isExpanded ? 'w-[calc(100vw-3rem)] max-w-sm absolute z-50 left-1/2 -translate-x-1/2' : ''}`}
      style={isExpanded ? { top: '10vh' } : {}}
      whileTap={!isExpanded ? { scale: 0.95 } : {}}
    >
      <motion.div 
        layout
        className={`bg-white/80 backdrop-blur-xl border border-white shadow-2xl ${glowColor} rounded-[2.5rem] p-7 overflow-hidden relative h-full min-h-[24rem] flex flex-col justify-between`}
      >
        {/* Decorative subtle background gradient */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full mix-blend-multiply filter blur-3xl opacity-10 ${isComodin ? 'bg-rose-400' : 'bg-brand-red'}`}></div>
        
        <div className="relative z-10 flex-grow">
          <div className="flex justify-between items-center mb-6">
            <motion.div layout className={`text-[10px] font-black tracking-[0.2em] uppercase ${accentColor}`}>
              {item.card.categoria}
            </motion.div>
            <Heart className={`w-4 h-4 ${accentColor} ${isExpanded ? 'fill-current' : ''}`} />
          </div>

          <motion.h3 layout className="text-2xl font-serif font-black text-slate-900 mb-4 leading-tight">
            {item.card.titulo}
          </motion.h3>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <p className="text-slate-600 leading-relaxed text-base font-medium">
                  {item.card.descripcion}
                </p>
                <div className="mt-10 pt-5 border-t border-slate-100 flex justify-center text-[10px] text-slate-400 uppercase tracking-widest font-black">
                  {item.card.tipo}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!isExpanded && (
            <motion.p layout className="text-sm text-slate-500 font-medium line-clamp-3 mt-4">
              {item.card.descripcion}
            </motion.p>
          )}
        </div>

        {!isExpanded && (
          <motion.div layout className="relative z-10 mt-6 pt-4 border-t border-slate-50 flex justify-center opacity-40">
            <div className="flex flex-col items-center gap-1">
              <div className="w-1 h-1 bg-brand-red rounded-full animate-bounce"></div>
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-900">Deslizá para jugar</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Backdrop overlay when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm -z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
