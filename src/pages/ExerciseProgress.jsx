import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { useStore } from '../store';
import { Page, BackLink, SectionLabel } from '../components/ui';
import ProgressChart from '../components/ProgressChart';
import { kg, norm, plural, shortDate } from '../lib/format';
import { TYPES } from '../lib/exercises';
import { METRIC, exerciseStats, recordIndexes, setText } from '../lib/records';

const PERIODS = [['3m', '3M', 91], ['6m', '6M', 182], ['1a', '1A', 365], ['all', 'Tudo', Infinity]];
const fullDate = (ts) => new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');

export default function ExerciseProgress() {
  const { key } = useParams();
  const [params, setParams] = useSearchParams();
  const sessions = useStore((s) => s.sessions);
  const stat = useMemo(() => exerciseStats(sessions).find((x) => x.key === norm(key)), [sessions, key]);
  const [period, setPeriod] = useState('all');

  if (!stat) {
    return (
      <Page>
        <BackLink to="/progresso" label="Progresso" />
        <p className="muted">Exercício sem histórico.</p>
      </Page>
    );
  }

  const { name, type, points } = stat;
  const canE1rm = type === 'weight';
  const useE1rm = canE1rm && params.get('metrica') === '1rm';
  const unit = useE1rm ? 'kg' : METRIC[type].unit;
  const metricLabel = useE1rm ? '1RM estimado' : METRIC[type].label;

  // recordes contam contra todo o histórico, mesmo quando o período mostra só uma parte
  const all = points.map((p) => ({ ...p, value: useE1rm ? p.e1rm : p.best }));
  const recordsAll = recordIndexes(all.map((p) => p.value));
  const recordSet = new Set(recordsAll);
  const span = all.at(-1).date - all[0].date;
  const periods = PERIODS.filter(([, , days]) => days === Infinity || span > days * 864e5);
  const current = periods.find(([k]) => k === period) || periods.at(-1);
  const days = current[2];
  const cutoff = Date.now() - days * 864e5;
  const first = all.findIndex((p) => p.date >= cutoff);
  const shown = first < 0 ? all.slice(-1) : all.slice(first);
  const offset = first < 0 ? all.length - 1 : first;
  const records = recordsAll.filter((i) => i >= offset).map((i) => i - offset);

  const topIdx = all.reduce((b, p, i) => (p.value > all[b].value ? i : b), 0);
  const last = shown.at(-1).value, delta = last - shown[0].value;
  const pct = shown[0].value ? Math.round((delta / shown[0].value) * 100) : null;
  const setsLine = (p) => p.sets.map((s) => setText(type, s)).join(' · ');

  return (
    <Page>
      <BackLink to="/progresso" label="Progresso" />
      <header className="detail-head">
        <h1>{name}</h1>
        <p className="muted small">
          {metricLabel} · {plural(points.length, 'treino')}
          {type !== 'weight' && ` · ${TYPES[type].label.toLowerCase()}`}
        </p>
      </header>

      <div className="progress-tools detail-tools">
        {periods.length > 1 && (
          <div className="seg metric-seg" role="radiogroup" aria-label="Período">
            {periods.map(([k, label]) => (
              <button key={k} role="radio" aria-checked={current[0] === k} className={current[0] === k ? 'on' : ''} onClick={() => setPeriod(k)}>
                {current[0] === k && <motion.span layoutId="period-seg" className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
        {canE1rm && (
          <div className="seg metric-seg" role="radiogroup" aria-label="Métrica">
            {[['best', 'Carga máx.'], ['1rm', '1RM est.']].map(([k, label]) => {
              const on = (k === '1rm') === useE1rm;
              return (
                <button key={k} role="radio" aria-checked={on} className={on ? 'on' : ''} onClick={() => setParams(k === '1rm' ? { metrica: '1rm' } : {}, { replace: true })}>
                  {on && <motion.span layoutId="detail-metric-seg" className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="tile tile-chart">
        {shown.length > 1 ? (
          <ProgressChart
            data={shown}
            records={records}
            format={(v) => kg(v)}
            unit={unit}
            label={`${name}: ${metricLabel} de ${kg(shown[0].value)} para ${kg(last)} ${unit} em ${plural(shown.length, 'treino')}`}
            tooltip={(p, isRecord) => (
              <>
                <span className="muted">{fullDate(p.date)}{isRecord && <span className="pr-inline"> · <Trophy size={11} /> recorde</span>}</span>
                <span className="mono faint">{setsLine(p)}</span>
              </>
            )}
          />
        ) : (
          <div className="spark-empty mono">treine mais uma vez neste período para ver a curva</div>
        )}
        <p className="pchart-hint faint small">arraste no gráfico para ver cada treino · <span className="pchart-key" /> recorde</p>
      </div>

      <div className="stats">
        <div className="stat">
          <b className="mono">{kg(all[topIdx].value)}<small> {unit}</small></b>
          <span>recorde · {shortDate(all[topIdx].date)}</span>
        </div>
        <div className="stat">
          <b className="mono">{kg(last)}<small> {unit}</small></b>
          <span>último treino</span>
        </div>
        <div className="stat">
          <b className={`mono ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>{delta > 0 ? '+' : ''}{kg(delta)}<small> {unit}</small></b>
          <span>no período{pct != null && delta !== 0 ? ` · ${delta > 0 ? '+' : ''}${pct}%` : ''}</span>
        </div>
      </div>

      {recordsAll.length > 0 && (
        <section className="list-group">
          <SectionLabel>{plural(recordsAll.length, 'recorde')}</SectionLabel>
          <ul className="list">
            {[...recordsAll].reverse().map((i) => {
              const p = all[i];
              const prevTop = Math.max(...all.slice(0, i).map((q) => q.value));
              return (
                <li key={p.sessionId}>
                  <Link to={`/historico/${p.sessionId}`} className="list-row">
                    <span className="list-main">
                      <b className="mono"><Trophy size={13} className="gold" /> {kg(p.value)} {unit}</b>
                      <span className="muted small mono">{kg(prevTop)} → {kg(p.value)} (+{kg(p.value - prevTop)})</span>
                    </span>
                    <span className="mono muted small">{fullDate(p.date)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="list-group">
        <SectionLabel>Treinos {days !== Infinity && 'no período'}</SectionLabel>
        <ul className="list">
          {[...shown].reverse().map((p, ri) => {
            const i = all.length - 1 - ri;
            return (
              <li key={p.sessionId}>
                <Link to={`/historico/${p.sessionId}`} className="list-row">
                  <span className="list-main">
                    <b className="mono">
                      {kg(p.value)} {unit}
                      {recordSet.has(i) && <Trophy size={12} className="gold" />}
                    </b>
                    <span className="muted small mono ellipsis">{setsLine(p)}</span>
                  </span>
                  <span className="mono muted small">{shortDate(p.date)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </Page>
  );
}
