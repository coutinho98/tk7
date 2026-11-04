import { useId, useLayoutEffect, useRef, useState } from 'react';

const HEIGHT = 220;
const PAD = { top: 14, right: 14, bottom: 26, left: 40 };

/** Largura do elemento, atualizada quando a tela muda de tamanho. */
function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Marcas "redondas" do eixo Y (1, 2, 2,5 ou 5 × potência de 10) cobrindo de min a max. */
function niceTicks(min, max, count = 4) {
  const span = max - min || Math.max(1, Math.abs(max) * 0.1);
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  let lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  if (lo === hi) { lo -= step; hi += step; }
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

const axisDate = (ts, withYear) =>
  new Date(ts).toLocaleDateString('pt-BR', withYear ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: 'short' }).replace('.', '');

/**
 * Linha de progresso no tempo. `data` = [{ date, value }], do mais antigo ao mais recente.
 * `records` = índices dos pontos que foram recorde. `tooltip(p)` devolve o conteúdo da dica.
 */
export default function ProgressChart({ data, records, format, unit, tooltip, label }) {
  const wrap = useRef(null);
  const width = useWidth(wrap);
  const gradId = useId();
  const [sel, setSel] = useState(null);

  const vals = data.map((d) => d.value);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const yMin = ticks[0], yMax = ticks.at(-1);
  const t0 = data[0].date, t1 = data.at(-1).date;
  const innerW = Math.max(1, width - PAD.left - PAD.right), innerH = HEIGHT - PAD.top - PAD.bottom;
  // por data; se todos caírem no mesmo instante, espalha por ordem
  const x = (d, i) => PAD.left + (t1 > t0 ? (d.date - t0) / (t1 - t0) : data.length > 1 ? i / (data.length - 1) : 0.5) * innerW;
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const pts = data.map((d, i) => [x(d, i), y(d.value)]);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
  const area = `${line}L${pts.at(-1)[0].toFixed(1)},${PAD.top + innerH}L${pts[0][0].toFixed(1)},${PAD.top + innerH}Z`;
  const recordSet = new Set(records);

  const withYear = t1 - t0 > 300 * 864e5;
  const xLabels = width > 320 && data.length > 2
    ? [[t0, 'start'], [(t0 + t1) / 2, 'middle'], [t1, 'end']]
    : [[t0, 'start'], [t1, 'end']];

  // ponto mais próximo do dedo/cursor no eixo X
  const pick = (ev) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    let best = 0;
    pts.forEach(([qx], i) => { if (Math.abs(qx - px) < Math.abs(pts[best][0] - px)) best = i; });
    setSel(best);
  };
  const onKey = (ev) => {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const dir = ev.key === 'ArrowRight' ? 1 : -1;
      setSel((s) => Math.min(data.length - 1, Math.max(0, (s ?? (dir > 0 ? -1 : data.length)) + dir)));
    } else if (ev.key === 'Escape') setSel(null);
  };

  const active = sel != null && data[sel] ? sel : null;
  // leitura fixa acima do gráfico: o ponto tocado, ou o mais recente
  const shown = active ?? data.length - 1;

  return (
    <div className="pchart" ref={wrap}>
      <div className={`pchart-read ${active != null ? 'on' : ''}`} role="status" aria-live="polite">
        <b className="mono">{format(data[shown].value)} <small>{unit}</small></b>
        {tooltip(data[shown], recordSet.has(shown))}
      </div>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          className="pchart-svg"
          tabIndex={0}
          role="img"
          aria-label={label}
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={(ev) => ev.pointerType === 'mouse' && setSel(null)}
          onKeyDown={onKey}
          onBlur={() => setSel(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.13" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line className="pchart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="pchart-tick" x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">{format(t)}</text>
            </g>
          ))}
          {xLabels.map(([t, anchor]) => (
            <text key={anchor} className="pchart-tick" x={anchor === 'start' ? PAD.left : anchor === 'end' ? width - PAD.right : PAD.left + innerW / 2} y={HEIGHT - 6} textAnchor={anchor}>
              {axisDate(t, withYear)}
            </text>
          ))}

          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {active != null && <line className="pchart-cross" x1={pts[active][0]} x2={pts[active][0]} y1={PAD.top} y2={PAD.top + innerH} />}

          {/* recordes em dourado; o último ponto sempre marcado */}
          {pts.map(([px, py], i) =>
            recordSet.has(i) || i === pts.length - 1 || i === active ? (
              <circle
                key={i}
                cx={px}
                cy={py}
                r={i === active ? 5.5 : 4.5}
                className={recordSet.has(i) ? 'pchart-dot pr' : 'pchart-dot'}
              />
            ) : null
          )}
        </svg>
      )}
    </div>
  );
}
