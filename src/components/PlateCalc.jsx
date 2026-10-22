import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sheet } from './Overlays';
import { Stepper } from './ui';
import { kg } from '../lib/format';

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BARS = [20, 15, 10, 0];

/** Quais anilhas colocar de cada lado (algoritmo guloso, da maior para a menor). */
export function platesPerSide(total, bar) {
  let side = Math.max(0, (total - bar) / 2);
  const plates = [];
  for (const p of PLATES) {
    while (side >= p - 1e-9) {
      plates.push(p);
      side -= p;
    }
  }
  return { plates, rest: Math.round(side * 2 * 100) / 100 };
}

/** Calculadora de anilhas: digite o peso total e veja o que colocar em cada lado da barra. */
export default function PlateCalc({ open, onClose, initial }) {
  return (
    <Sheet open={open} onClose={onClose} title="Calculadora de anilhas">
      {open && <Calc initial={initial} onClose={onClose} />}
    </Sheet>
  );
}

function Calc({ initial, onClose }) {
  const [total, setTotal] = useState(initial || 60);
  const [bar, setBar] = useState(20);
  const { plates, rest } = platesPerSide(total || 0, bar);

  return (
    <>
      <div className="calc-row">
        <Stepper label="Peso total" suffix="kg" value={total} step={2.5} onChange={setTotal} />
        <div className="calc-bar">
          <span className="stepper-label">Barra</span>
          <div className="calc-bar-opts">
            {BARS.map((b) => (
              <button key={b} className={`rest-opt mono ${bar === b ? 'on' : ''}`} onClick={() => setBar(b)}>
                {b ? `${b}kg` : 'sem'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="barbell" aria-label={`Cada lado: ${plates.map((p) => kg(p, 2)).join(', ') || 'nenhuma anilha'}`}>
        <div className="barbell-sleeve" />
        <div className="barbell-collar" />
        <div className="barbell-plates">
          <AnimatePresence initial={false}>
            {plates.map((p, i) => (
              <motion.div
                key={`${i}-${p}`}
                className="bplate"
                style={{ '--h': `${44 + (p / 25) * 56}%` }}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              >
                <span className="mono">{kg(p, 2)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <p className="calc-summary">
        {plates.length ? (
          <>Em <b>cada lado</b>: {plates.map((p) => kg(p, 2)).join(' + ')} kg</>
        ) : (
          <>Só a barra{bar ? ` (${bar} kg)` : ''}.</>
        )}
        {rest > 0 && <span className="muted"> · faltam {kg(rest, 2)} kg para fechar</span>}
      </p>
      <button className="btn wide" onClick={onClose}>Fechar</button>
    </>
  );
}
