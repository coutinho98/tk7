import { AnimatePresence, motion } from 'motion/react';
import { SkipForward } from 'lucide-react';
import { useStore } from '../store';
import { useNow } from '../lib/hooks';
import { clock } from '../lib/format';

// Movimento curto e sem quique, na curva de desaceleração do iOS.
const EASE = [0.32, 0.72, 0, 1];
const device = {
  hidden: { y: 18, opacity: 0, scale: 0.98 },
  show: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.42, ease: EASE } },
  exit: { y: 12, opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
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
            <div className="device-grille" aria-hidden="true" />
            <div className="lcd">
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
              <motion.button whileTap={{ scale: 0.92 }} className="key key-sm" onClick={() => adjustRest(15)} aria-label="Mais 15 segundos">
                +15
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} className="key key-sm" onClick={() => adjustRest(-15)} aria-label="Menos 15 segundos">
                −15
              </motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.94 }} className="key key-lg" onClick={endRest} aria-label="Pular descanso">
              <SkipForward size={18} fill="currentColor" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tempo em que só o dígito que muda troca, com um deslize curto e discreto. */
function RollingTime({ text }) {
  return (
    <div className="lcd-time" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={`${text.length}-${i}`} className="digit" aria-hidden="true">
          <AnimatePresence initial={false}>
            <motion.span
              key={ch}
              initial={{ y: '-30%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '30%', opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </div>
  );
}
