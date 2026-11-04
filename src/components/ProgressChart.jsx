import { useId, useLayoutEffect, useRef, useState } from 'react';

const HEIGHT = 180;
const PAD = { top: 16, right: 10, bottom: 24, left: 10 };

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

/** Curva suave que nunca passa acima/abaixo dos pontos (monotônica, Fritsch–Carlson). */
function smoothPath(pts) {
  if (pts.length < 3) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
  const n = pts.length;
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0] || 1e-6;
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  t[n - 1] = m[n - 2];
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = dx[i] / 3;
    d += `C${x0 + h},${y0 + h * t[i]} ${x1 - h},${y1 - h * t[i + 1]} ${x1},${y1}`;
  }
  return d;
}

const axisDate = (ts) => new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');

/**
 * Linha de progresso no tempo. `data` = [{ date, value }], do mais antigo ao mais recente.
 * `top` = índice do recorde (ponto dourado). `readout(p, i | null)` monta a linha de leitura:
 * com i = null é o estado parado; com um índice, o treino tocado.
 */
export default function ProgressChart({ data, top, format, label, readout }) {
  const wrap = useRef(null);
  const width = useWidth(wrap);
  const gradId = useId();
  const [sel, setSel] = useState(null);

  const vals = data.map((d) => d.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo || Math.max(1, hi * 0.1)) * 0.12;
  const yMin = lo - pad, yMax = hi + pad;
  const t0 = data[0].date, t1 = data.at(-1).date;
  const innerW = Math.max(1, width - PAD.left - PAD.right), innerH = HEIGHT - PAD.top - PAD.bottom;
  // por data; se todos caírem no mesmo instante, espalha por ordem
  const x = (d, i) => PAD.left + (t1 > t0 ? (d.date - t0) / (t1 - t0) : i / Math.max(1, data.length - 1)) * innerW;
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const pts = data.map((d, i) => [+x(d, i).toFixed(1), +y(d.value).toFixed(1)]);
  const line = smoothPath(pts);
  const base = PAD.top + innerH;
  const area = `${line}L${pts.at(-1)[0]},${base}L${pts[0][0]},${base}Z`;

  const pick = (ev) => {
    const px = ev.clientX - ev.currentTarget.getBoundingClientRect().left;
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

  // rótulo do recorde: acima do ponto, puxado para dentro nas bordas
  const [tx, ty] = pts[top] || [0, 0];
  const anchor = tx < 40 ? 'start' : tx > width - 40 ? 'end' : 'middle';

  return (
    <div className="pchart" ref={wrap}>
      <div className={`pchart-read ${active != null ? 'on' : ''}`} role="status" aria-live="polite">
        {readout(data[active ?? top], active)}
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
          onPointerUp={(ev) => ev.pointerType !== 'mouse' && setSel(null)}
          onPointerCancel={() => setSel(null)}
          onKeyDown={onKey}
          onBlur={() => setSel(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--tape)" stopOpacity="0.18" />
              <stop offset="1" stopColor="var(--tape)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line className="pchart-base" x1={PAD.left} x2={width - PAD.right} y1={base + 0.5} y2={base + 0.5} />
          <text className="pchart-tick" x={PAD.left} y={HEIGHT - 6} textAnchor="start">{axisDate(t0)}</text>
          <text className="pchart-tick" x={width - PAD.right} y={HEIGHT - 6} textAnchor="end">{axisDate(t1)}</text>

          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} className="pchart-line" />

          {active != null && <line className="pchart-cross" x1={pts[active][0]} x2={pts[active][0]} y1={PAD.top - 6} y2={base} />}

          {active == null && (
            <text className="pchart-flag" x={tx} y={ty - 12} textAnchor={anchor}>{format(data[top].value)}</text>
          )}
          <circle cx={tx} cy={ty} r="5" className="pchart-dot pr" />
          {active != null && active !== top && <circle cx={pts[active][0]} cy={pts[active][1]} r="5" className="pchart-dot" />}
          {active == null && top !== pts.length - 1 && <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="4" className="pchart-dot" />}
        </svg>
      )}
    </div>
  );
}

/**
 * Mini-gráfico de tendência para listas: desenhado no tamanho real (sem esticar) e com uma faixa
 * mínima no eixo Y, para que 50 → 52,5 kg não pareça uma montanha-russa.
 * Mostra de onde saiu (anel + linha pontilhada no nível inicial) e onde está (ponto cheio,
 * dourado quando é recorde). `tone` = 'up' | 'down' | 'flat' pinta linha e área.
 */
export function MiniTrend({ values, record = false, tone, width = 76, height = 30 }) {
  const gradId = useId();
  const cls = `mini-trend ${tone || ''}`;
  if (values.length < 2) {
    // um treino só: um ponto, sem linha
    return (
      <svg className={cls} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line className="mini-trend-ref" x1={4} x2={width - 4} y1={height / 2} y2={height / 2} />
        <circle cx={width - 4} cy={height / 2} r="3" className="pchart-dot" />
      </svg>
    );
  }
  const pad = 4;
  const lo = Math.min(...values), hi = Math.max(...values);
  // faixa mínima de 30% da carga: oscilar 50 ↔ 55 kg aparece como ondinha, não como serrote
  const span = Math.max(hi - lo, Math.abs(hi) * 0.3, 1);
  const mid = (hi + lo) / 2;
  const yMin = mid - span / 2;
  const y = (v) => +(pad + (1 - (v - yMin) / span) * (height - pad * 2)).toFixed(1);
  const pts = values.map((v, i) => [+(pad + (i / (values.length - 1)) * (width - pad * 2)).toFixed(1), y(v)]);
  const line = smoothPath(pts);
  const [fx, fy] = pts[0], [lx, ly] = pts.at(-1);
  return (
    <svg className={cls} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.12" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line className="mini-trend-ref" x1={fx} x2={lx} y1={fy} y2={fy} />
      <path d={`${line}L${lx},${height}L${fx},${height}Z`} fill={`url(#${gradId})`} />
      <path d={line} className="mini-trend-line" />
      <circle cx={fx} cy={fy} r="2" className="mini-trend-start" />
      {record && <circle cx={lx} cy={ly} r="6.5" className="mini-trend-halo" />}
      <circle cx={lx} cy={ly} r="3" className={record ? 'pchart-dot pr' : 'pchart-dot'} />
    </svg>
  );
}
