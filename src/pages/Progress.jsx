import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import { Page, Chip, Sparkline } from '../components/ui';
import Body from './Body';
import { kg, norm, plural, shortDate } from '../lib/format';
import { TYPES, typeOf } from '../lib/exercises';
import { METRIC, best, bestE1rm } from '../lib/records';

/** Para cada exercício, a melhor marca em cada treino (do mais antigo ao mais recente). */
function exerciseStats(sessions) {
  const map = new Map();
  for (const s of [...sessions].reverse()) {
    for (const e of s.exercises) {
      const type = typeOf(e);
      const value = best(type, e.sets);
      if (value == null) continue;
      const k = norm(e.name);
      if (!map.has(k)) map.set(k, { name: e.name, type, points: [] });
      map.get(k).points.push({ date: s.start, best: value, e1rm: type === 'weight' ? bestE1rm(e.sets) : null });
    }
  }
  return [...map.values()].sort((a, b) => b.points.at(-1).date - a.points.at(-1).date);
}

const TABS = [['ex', 'Exercícios'], ['body', 'Corpo']];

export default function Progress() {
  // ?aba=corpo abre direto na aba Corpo (usado pelo atalho do ícone).
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('aba') === 'corpo' ? 'body' : 'ex');
  return (
    <Page>
      <div className="seg seg-wide tabs-top" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            {tab === key && <motion.span layoutId="progress-tab" className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      {tab === 'ex' ? <Exercises /> : <Body />}
    </Page>
  );
}

function Exercises() {
  const sessions = useStore((s) => s.sessions);
  const stats = useMemo(() => exerciseStats(sessions), [sessions]);
  const [query, setQuery] = useState('');
  const [metric, setMetric] = useState('best');

  if (!stats.length) {
    return (
      <section className="prose intro">
        <p>Progresso,</p>
        <p>Aqui aparece a <b>evolução</b> de cada exercício. Faça seu primeiro treino para começar a curva.</p>
      </section>
    );
  }

  const ups = stats.filter((s) => s.points.length > 1 && s.points.at(-1).best > s.points[0].best).length;
  const shown = stats.filter((s) => norm(s.name).includes(norm(query)));

  return (
    <>
      <section className="prose intro">
        <p>Progresso,</p>
        <p>
          Você registrou <Chip>{plural(stats.length, 'exercício')}</Chip>
          {ups > 0 && <> e já evoluiu em <b>{ups}</b> deles</>}. Continue assim.
        </p>
      </section>

      <div className="progress-tools">
        {stats.length > 4 && (
          <input className="search" placeholder="Buscar exercício" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar exercício" />
        )}
        <div className="seg metric-seg" role="radiogroup" aria-label="Métrica dos exercícios com carga">
          {[['best', 'Carga máx.'], ['e1rm', '1RM est.']].map(([key, label]) => (
            <button key={key} role="radio" aria-checked={metric === key} className={metric === key ? 'on' : ''} onClick={() => setMetric(key)}>
              {metric === key && <motion.span layoutId="metric-seg" className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      {metric === 'e1rm' && (
        <p className="muted small hint-block">
          <b>1RM estimado</b>: quanto você levantaria numa repetição só, calculado a partir de carga × reps. Mostra a evolução mesmo quando você muda as repetições.
        </p>
      )}

      <div className="tiles">
        {shown.map(({ name, type, points }, i) => {
          const useE1rm = metric === 'e1rm' && type === 'weight';
          const vals = points.map((p) => (useE1rm ? p.e1rm : p.best));
          const unit = useE1rm ? 'kg' : METRIC[type].unit;
          const last = vals.at(-1), top = Math.max(...vals), delta = last - vals[0];
          return (
            <motion.article
              key={name}
              className="tile-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="tile tile-progress">
                <div className="progress-top">
                  <span className="progress-value mono">{kg(last)}<small>{unit}</small></span>
                  {points.length > 1 && Math.abs(delta) >= 0.05 && (
                    <span className={`delta mono ${delta > 0 ? 'up' : 'down'}`}>
                      {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {delta > 0 ? '+' : ''}{kg(delta)}
                    </span>
                  )}
                </div>
                <Sparkline values={vals.slice(-20)} />
                <div className="progress-axis mono">
                  <span>{shortDate(points.at(-Math.min(20, points.length)).date)}</span>
                  <span>{shortDate(points.at(-1).date)}</span>
                </div>
              </div>
              <div className="tile-caption">
                <div>
                  <h3>{name}</h3>
                  <p className="muted small">
                    {useE1rm ? '1RM' : METRIC[type].label} · recorde {kg(top)} {unit} · {plural(points.length, 'treino')}
                    {type !== 'weight' && ` · ${TYPES[type].label.toLowerCase()}`}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </>
  );
}
