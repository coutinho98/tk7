import { useMemo } from 'react';
import { heatmap } from '../lib/records';

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Mapa de calor dos dias treinados nas últimas semanas (estilo GitHub). */
export default function Heatmap({ sessions, weeks = 17 }) {
  const days = useMemo(() => heatmap(sessions, weeks), [sessions, weeks]);
  const total = days.filter((d) => d.count).length;

  // rótulos de mês na coluna em que o mês começa
  const months = [];
  for (let w = 0; w < weeks; w++) {
    const first = days[w * 7].date;
    const prev = w ? days[(w - 1) * 7].date : null;
    const tooClose = months.length && w - months.at(-1).col < 3;
    if ((!prev || prev.getMonth() !== first.getMonth()) && !tooClose) {
      months.push({ col: w, label: first.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
    }
  }

  return (
    <figure className="heatmap" aria-label={`${total} dias treinados nas últimas ${weeks} semanas`}>
      <div className="heatmap-months" style={{ '--weeks': weeks }}>
        {months.map((m) => <span key={m.col} style={{ gridColumn: m.col + 2 }}>{m.label}</span>)}
      </div>
      <div className="heatmap-body" style={{ '--weeks': weeks }}>
        <div className="heatmap-days">{WEEKDAYS.map((d, i) => <span key={i}>{i % 2 === 0 ? d : ''}</span>)}</div>
        <div className="heatmap-grid">
          {days.map((d) => (
            <i
              key={d.date.getTime()}
              className={d.future ? 'future' : d.count >= 2 ? 'l2' : d.count ? 'l1' : ''}
              title={`${d.date.toLocaleDateString('pt-BR')}${d.count ? ` · ${d.count} treino${d.count > 1 ? 's' : ''}` : ''}`}
            />
          ))}
        </div>
      </div>
    </figure>
  );
}
