import { useId } from 'react';

/** Cores das etiquetas, uma por treino (na ordem da lista). */
export const TAPE_COLORS = ['#ff5a1f', '#2f6bff', '#19b46b', '#f5b400', '#b04bff', '#ff3d7f'];

/** Cor da fita de um treino, pela posição dele na lista. */
export const tapeColor = (workouts, workoutId) =>
  TAPE_COLORS[Math.max(0, workouts.findIndex((w) => w.id === workoutId)) % TAPE_COLORS.length];

/**
 * Fita cassete feita em SVG — o "objeto" de cada treino.
 * O treino é a fita; o cronômetro de descanso (walkman) é o player.
 * As bobinas giram com `playing` ou quando o card pai está em hover (ver .tile:hover .reel no CSS).
 */
export default function Cassette({ letter, title, tracks, footnote, color = TAPE_COLORS[0], playing = false, width = 260 }) {
  const id = useId().replace(/:/g, '');
  // títulos longos encolhem para caber na etiqueta
  const titleSize = Math.min(23, Math.max(14, 520 / Math.max(1, title.length)));

  return (
    <svg
      className={`cassette ${playing ? 'playing' : ''}`}
      viewBox="0 0 300 190"
      width={width}
      style={{ maxWidth: '100%', height: 'auto' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3e" />
          <stop offset="1" stopColor="#161618" />
        </linearGradient>
        <linearGradient id={`window-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a2d" />
          <stop offset="1" stopColor="#0e0e0f" />
        </linearGradient>
        <clipPath id={`label-${id}`}>
          <rect x="16" y="14" width="268" height="122" rx="8" />
        </clipPath>
      </defs>

      {/* corpo */}
      <rect x="1" y="1" width="298" height="188" rx="14" fill={`url(#body-${id})`} />
      <rect x="1.5" y="1.5" width="297" height="187" rx="13.5" fill="none" stroke="rgba(255,255,255,.12)" />

      {/* etiqueta */}
      <g clipPath={`url(#label-${id})`}>
        <rect x="16" y="14" width="268" height="122" fill="#f3efe6" />
        <rect x="16" y="14" width="268" height="28" fill={color} />
        <rect x="16" y="42" width="268" height="2" fill="rgba(0,0,0,.08)" />
      </g>
      <text x="30" y="35" className="tape-letter" fill="#fff">{letter}</text>
      <text x="270" y="33" className="tape-meta" fill="rgba(255,255,255,.9)" textAnchor="end">
        {tracks} {tracks === 1 ? 'FAIXA' : 'FAIXAS'}
      </text>
      <text x="30" y="68" className="tape-title" style={{ fontSize: titleSize }} fill="#1d1d1f">{title}</text>
      <line x1="28" y1="76" x2="272" y2="76" stroke="#d8d1c2" strokeWidth="1" />

      {/* janela com as bobinas */}
      <rect x="62" y="82" width="176" height="38" rx="19" fill={`url(#window-${id})`} stroke="#cfc8b8" strokeWidth="2" />
      <rect x="112" y="94" width="76" height="14" rx="2" fill="rgba(255,255,255,.05)" />
      <circle cx="100" cy="101" r="15.5" fill="#3b2a22" />
      <circle cx="200" cy="101" r="11.5" fill="#3b2a22" />
      <Reel cx={100} cy={101} />
      <Reel cx={200} cy={101} />

      {footnote && <text x="150" y="133" className="tape-foot" fill="#7d776a" textAnchor="middle">{footnote}</text>}

      {/* parte de baixo */}
      <path d="M72 189 L86 152 L214 152 L228 189 Z" fill="#2a2a2d" stroke="rgba(255,255,255,.08)" />
      <circle cx="112" cy="172" r="5" fill="#0c0c0d" />
      <circle cx="188" cy="172" r="5" fill="#0c0c0d" />
      <rect x="138" y="165" width="8" height="8" rx="1.5" fill="#0c0c0d" />
      <rect x="154" y="165" width="8" height="8" rx="1.5" fill="#0c0c0d" />

      {/* parafusos */}
      {[[11, 11], [289, 11], [11, 179], [289, 179], [150, 145]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="4" fill="#77777c" />
          <path d={`M${x - 2.4} ${y}h4.8M${x} ${y - 2.4}v4.8`} stroke="#3a3a3e" strokeWidth="1.2" />
        </g>
      ))}
    </svg>
  );
}

function Reel({ cx, cy }) {
  return (
    <g className="reel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r="10" fill="#f5f5f5" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <rect key={a} x={cx - 1.6} y={cy - 9.5} width="3.2" height="4" rx="0.8" fill="#1b1b1d" transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r="3.2" fill="#1b1b1d" />
    </g>
  );
}
