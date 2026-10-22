import { AnimatePresence, motion } from 'motion/react';
import { SkipForward } from 'lucide-react';
import { useStore } from '../store';
import { useNow } from '../lib/hooks';
import { clock } from '../lib/format';

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
        <motion.div
          className="device-wrap"
          initial={{ y: 140, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 140, opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          <div className="device" role="timer" aria-live="off">
            <div className="device-grille" aria-hidden="true" />
            <div className="lcd">
              <div className="lcd-top">
                <span>DESCANSO</span>
                <span className="lcd-label">{active.restLabel}</span>
              </div>
              <div className="lcd-time">{clock(Math.ceil(left / 1000))}</div>
              <div className="lcd-bar">
                <i style={{ transform: `scaleX(${pct})` }} />
              </div>
            </div>
            <div className="device-keys">
              <motion.button whileTap={{ scale: 0.88 }} className="key key-sm" onClick={() => adjustRest(15)} aria-label="Mais 15 segundos">
                +15
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} className="key key-sm" onClick={() => adjustRest(-15)} aria-label="Menos 15 segundos">
                −15
              </motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} className="key key-lg" onClick={endRest} aria-label="Pular descanso">
              <SkipForward size={18} fill="currentColor" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
