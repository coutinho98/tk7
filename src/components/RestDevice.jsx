import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';
import { SkipForward, Trophy } from 'lucide-react';
import { useStore } from '../store';
import { useNow } from '../lib/hooks';
import { clock, kg } from '../lib/format';

/** Quanto tempo o visor fica no modo recorde antes de voltar ao cronômetro. */
const PR_MS = 4200;
const screen = {
  initial: { opacity: 0, filter: 'blur(5px)', y: 4 },
  animate: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } },
  exit: { opacity: 0, filter: 'blur(5px)', y: -4, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

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
  const flash = useStore((s) => s.prFlash);
  const celebrating = resting && !!flash && now - flash.at < PR_MS;

  const left = resting ? Math.max(0, active.restEnd - now) : 0;
  const pct = resting ? Math.min(1, left / (active.restTotal * 1000)) : 0;

  return (
    <AnimatePresence>
      {resting && (
        <motion.div className="device-wrap" variants={device} initial="hidden" animate="show" exit="exit">
          <motion.div
            className={`device ${celebrating ? 'pr' : ''}`}
            role="timer"
            aria-live="off"
            animate={{ scale: celebrating ? [1, 1.035, 1] : 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="device-grille" aria-hidden="true" />
            <div className="lcd">
              <AnimatePresence initial={false}>
                {celebrating ? (
                  <motion.div key={`pr-${flash.at}`} className="lcd-screen" {...screen}>
                    <div className="lcd-top">
                      <span className="lcd-pr-tag"><Trophy size={9} strokeWidth={2.6} /> RECORDE</span>
                      <span className="lcd-label">{flash.name}</span>
                    </div>
                    <div className="lcd-time">
                      <CountUp from={flash.prev} to={flash.value} />
                      <small className="lcd-unit">{flash.unit}</small>
                    </div>
                    <div className="lcd-top lcd-delta">
                      <span>+{kg(flash.value - flash.prev)} {flash.unit}</span>
                      <span>ANTES {kg(flash.prev)}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="rest" className="lcd-screen" {...screen}>
                    <div className="lcd-top">
                      <span>DESCANSO</span>
                      <span className="lcd-label">{active.restLabel}</span>
                    </div>
                    <RollingTime text={clock(Math.ceil(left / 1000))} />
                    <div className="lcd-bar">
                      <i style={{ transform: `scaleX(${pct})` }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {celebrating && <span key={flash.at} className="lcd-glare" aria-hidden="true" />}
            </div>
            <span className="sr-only" role="status">
              {celebrating ? `Novo recorde em ${flash.name}: ${kg(flash.value)} ${flash.unit}, antes ${kg(flash.prev)}` : ''}
            </span>
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
          </motion.div>
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

/** A marca nova "subindo" do recorde antigo até o novo, como um medidor. */
function CountUp({ from, to }) {
  const [value, setValue] = useState(from);
  const digits = Number.isInteger(to) ? 0 : 1;
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setValue(to);
    const run = animate(from, to, { duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1], onUpdate: setValue });
    return () => run.stop();
  }, [from, to]);
  return <span>{value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}</span>;
}
