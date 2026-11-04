import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { Page, Chip } from '../components/ui';
import { MiniTrend } from '../components/ProgressChart';
import Body from './Body';
import EmptyState from '../components/EmptyState';
import { kg, norm, plural } from '../lib/format';
import { TYPES } from '../lib/exercises';
import { METRIC, exerciseStats } from '../lib/records';

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
      <>
        <section className="prose intro">
          <p>Progresso,</p>
          <p>Aqui aparece a <b>evolução</b> de cada exercício. Faça seu primeiro treino para começar a curva.</p>
        </section>
        <EmptyState label="sem curvas por enquanto" />
      </>
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

      <ul className="list trend-list">
        {shown.map(({ key, name, type, points }, i) => {
          const useE1rm = metric === 'e1rm' && type === 'weight';
          const vals = points.map((p) => (useE1rm ? p.e1rm : p.best)).slice(-20);
          const unit = useE1rm ? 'kg' : METRIC[type].unit;
          const last = vals.at(-1), delta = last - vals[0];
          const isRecord = vals.length > 1 && last >= Math.max(...points.map((p) => (useE1rm ? p.e1rm : p.best))) && delta > 0;
          const trend = vals.length < 2 ? null : Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down';
          return (
            <motion.li key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <Link to={`/progresso/${encodeURIComponent(key)}${useE1rm ? '?metrica=1rm' : ''}`} className="list-row trend-row">
                <span className="list-main">
                  <b>{name}</b>
                  <span className="muted small">
                    {kg(last)}&nbsp;{unit} · {plural(points.length, 'treino')}
                    {type !== 'weight' && ` · ${TYPES[type].label.toLowerCase()}`}
                  </span>
                </span>
                <MiniTrend values={vals} record={isRecord} tone={trend} />
                <span className={`trend-delta ${trend || ''}`}>
                  {trend === 'flat' ? 'igual' : trend ? <>{delta > 0 ? '+' : '−'}{kg(Math.abs(delta))}<small>{unit}</small></> : <small>1º treino</small>}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </>
  );
}
