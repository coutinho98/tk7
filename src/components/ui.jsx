import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import { useNow } from '../lib/hooks';
import { restLabel } from '../lib/format';

/** Curva de desaceleração no estilo iOS, usada nas transições. */
export const EASE = [0.32, 0.72, 0, 1];

/** Envolve cada tela com uma entrada suave (só opacidade e um deslize curto: leve para o celular). */
export function Page({ children, className = '', style }) {
  return (
    <motion.main
      className={`page ${className}`}
      style={style}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      {children}
      <Footer />
    </motion.main>
  );
}

export function BackLink({ to = '/', label = 'Voltar' }) {
  return (
    <Link to={to} className="back" aria-label={label}>
      <ChevronLeft size={16} /> {label}
    </Link>
  );
}

/** Rodapé com relógio, inspirado no "peace out 08:12:01". */
export function Footer() {
  const now = useNow(1000);
  return (
    <footer className="footer">
      <span>TK7 · bom treino</span>
      <span className="mono">{new Date(now).toLocaleTimeString('pt-BR')}</span>
    </footer>
  );
}

/** Pílula cinza dentro do texto, como "submit it" nas referências. */
export function Chip({ children, as: As = 'span', ...props }) {
  return <As className="chip" {...props}>{children}</As>;
}

export function SectionLabel({ children, action }) {
  return (
    <div className="section-label">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <motion.span layout className="switch-knob" transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
    </button>
  );
}

/** Campo numérico com botões − e +. */
export function Stepper({ value, onChange, min = 0, step = 1, label, suffix }) {
  const v = value ?? 0;
  const set = (n) => onChange(Math.max(min, Math.round(n * 10) / 10));
  return (
    <div className="stepper">
      <span className="stepper-label">{label}{suffix && <em> · {suffix}</em>}</span>
      <div className="stepper-body">
        <button type="button" onClick={() => set(v - step)} aria-label={`Diminuir ${label}`}><Minus size={14} /></button>
        <input
          className="mono"
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          placeholder="—"
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value.replace(',', '.')))}
          onFocus={(e) => e.target.select()}
          aria-label={label}
        />
        <button type="button" onClick={() => set(v + step)} aria-label={`Aumentar ${label}`}><Plus size={14} /></button>
      </div>
    </div>
  );
}

export function Sparkline({ values, height = 56, empty = 'treine mais uma vez para ver a curva' }) {
  if (values.length < 2) return <div className="spark-empty mono">{empty}</div>;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 36 - ((v - min) / span) * 30]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `0,40 ${line} 100,40`;
  const [lx, ly] = pts.at(-1);
  return (
    <svg className="spark" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.2" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Fileira de tempos de descanso para escolher. */
export function RestPick({ label, options, value, onChange }) {
  return (
    <div className="rest-pick">
      <span className="stepper-label">{label}</span>
      <div className="rest-options" role="radiogroup" aria-label={label}>
        {options.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            className={`rest-opt mono ${value === s ? 'on' : ''}`}
            onClick={() => onChange(s)}
          >
            {restLabel(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
