import { AnimatePresence, motion } from 'motion/react';
import { SkipForward } from 'lucide-react';
import { useStore } from '../store';
import { useNow } from '../lib/hooks';
import { clock } from '../lib/format';

// Entrada em cascata: o aparelho sobe e "acorda", depois cada peça aparece.
const device = {
  hidden: { y: 70, opacity: 0, scale: 0.9, filter: 'blur(8px)' },
  show: {
    y: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring', stiffness: 260, damping: 24, mass: 0.9,
      opacity: { duration: 0.25 }, filter: { duration: 0.35 },
      delayChildren: 0.1, staggerChildren: 0.06,
    },
  },
  exit: { y: 50, opacity: 0, scale: 0.94, filter: 'blur(6px)', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};
const part = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 26 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/** O cronômetro de descanso, em forma de aparelhinho estilo walkman. */
export default function RestDevice() {
  const active = useStore((s) => s.active);
  const adjustRest = useStore((s) => s.adjustRest);
  const endRest = useStore((s) => s.endRest);
  const resting = !!active?.restEnd;
  const now = useNow(200, resting);

  const left = resting ? Math.max(0, active.restEnd - now) : 0;
  const pct = resting ? Math.min(1, left / (active.restTotal * 1000)) : 0;

  return (
    <AnimatePresence>
      {resting && (
        <motion.div className="device-wrap" variants={device} initial="hidden" animate="show" exit="exit">
          <div className="device" role="timer" aria-live="off">
            <motion.div className="device-grille" variants={part} aria-hidden="true" />
            <div className={`lcd ${left <= 3000 ? 'ending' : ''}`}>
              <div className="lcd-top">
                <span>DESCANSO</span>
                <span className="lcd-label">{active.restLabel}</span>
              </div>
              <RollingTime text={clock(Math.ceil(left / 1000))} />
              <div className="lcd-bar">
                <i style={{ transform: `scaleX(${pct})` }} />
              </div>
            </div>
            <div className="device-keys">
              <motion.button variants={part} whileTap={{ scale: 0.88 }} className="key key-sm" onClick={() => adjustRest(15)} aria-label="Mais 15 segundos">
                +15
              </motion.button>
              <motion.button variants={part} whileTap={{ scale: 0.88 }} className="key key-sm" onClick={() => adjustRest(-15)} aria-label="Menos 15 segundos">
                −15
              </motion.button>
            </div>
            <motion.button variants={part} whileTap={{ scale: 0.9 }} className="key key-lg" onClick={endRest} aria-label="Pular descanso">
              <SkipForward size={18} fill="currentColor" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tempo com dígitos que rolam ao trocar, como um contador mecânico. */
function RollingTime({ text }) {
  return (
    <div className="lcd-time" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={`${text.length}-${i}`} className="digit" aria-hidden="true">
          <AnimatePresence initial={false}>
            <motion.span
              key={ch}
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </div>
  );
}
