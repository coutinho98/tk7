import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { useStore } from '../store';
import { Page, BackLink, Chip, SectionLabel } from '../components/ui';
import ProgressChart from '../components/ProgressChart';
import { tapeColor } from '../components/Cassette';
import { kg, norm, plural } from '../lib/format';
import { METRIC, exerciseStats, recordIndexes, setText } from '../lib/records';

const PERIODS = [['3m', '3M', 91], ['6m', '6M', 182], ['1a', '1A', 365], ['all', 'Tudo', Infinity]];
const DAY = 864e5;

/** "21 out" e "21 de out de 2026". */
const dayMonth = (ts) => {
  const d = new Date(ts);
  return `${d.getDate()} ${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;
};
const fullDate = (ts) => new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');

/** Intervalo por extenso: "12 dias", "5 semanas", "9 meses", "2 anos". */
function spanWords(ms) {
  const days = Math.round(ms / DAY);
  if (days < 14) return plural(Math.max(1, days), 'dia');
  if (days < 60) return plural(Math.round(days / 7), 'semana');
  if (days < 548) return plural(Math.round(days / 30.4), 'mês', 'meses');
  return plural(Math.round(days / 365), 'ano');
}

/** Como chamar a métrica numa frase. */
const SUBJECT = { weight: 'sua carga', e1rm: 'seu 1RM estimado', bodyweight: 'suas repetições', time: 'seu tempo', cardio: 'sua distância' };

export default function ExerciseProgress() {
  const { key } = useParams();
  const [params, setParams] = useSearchParams();
  const sessions = useStore((s) => s.sessions);
  const workouts = useStore((s) => s.workouts);
  const stat = useMemo(() => exerciseStats(sessions).find((x) => x.key === norm(key)), [sessions, key]);
  const [period, setPeriod] = useState('all');
  const [allRecords, setAllRecords] = useState(false);
  const [allSessions, setAllSessions] = useState(false);

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
  const withUnit = (v) => `${kg(v)}\u00a0${unit}`; // espaço que não quebra: "80 kg" fica junto

  // recordes contam contra todo o histórico, mesmo quando o período mostra só uma parte
  const all = points.map((p) => ({ ...p, value: useE1rm ? p.e1rm : p.best }));
  const recordSet = new Set(recordIndexes(all.map((p) => p.value)));
  const span = all.at(-1).date - all[0].date;
  const periods = PERIODS.filter(([, , days]) => days === Infinity || span > days * DAY);
  const current = periods.find(([k]) => k === period) || periods.at(-1);
  const cutoff = Date.now() - current[2] * DAY;
  const firstIn = all.findIndex((p) => p.date >= cutoff);
  const shown = firstIn < 0 ? all.slice(-1) : all.slice(firstIn);
  const offset = all.length - shown.length;

  const topAll = all.reduce((b, p, i) => (p.value > all[b].value ? i : b), 0);
  const topShown = shown.reduce((b, p, i) => (p.value > shown[b].value ? i : b), 0);
  const from = shown[0], last = shown.at(-1);
  const delta = last.value - from.value;
  const pct = from.value ? Math.round((delta / from.value) * 100) : null;
  const recordsInPeriod = [...recordSet].filter((i) => i >= offset).length;
  const subject = SUBJECT[useE1rm ? 'e1rm' : type];

  // a história do período numa frase, no tom do resto do app
  const story = shown.length < 2 ? (
    <>Só um treino neste período, com <b>{withUnit(last.value)}</b>. Treine mais uma vez para ver a curva.</>
  ) : delta > 0 ? (
    <>
      Em {spanWords(last.date - from.date)}, {subject} foi de <Chip>{withUnit(from.value)}</Chip> para <b>{withUnit(last.value)}</b>
      {pct ? <>, <span className="up-text">+{pct}%</span></> : null}.
      {recordsInPeriod > 0 && <> Você bateu o recorde <b>{recordsInPeriod === 1 ? 'uma vez' : `${recordsInPeriod} vezes`}</b>.</>}
    </>
  ) : delta === 0 ? (
    <>Há {spanWords(last.date - from.date)} {subject} está firme em <b>{withUnit(last.value)}</b>. Que tal tentar subir um pouco?</>
  ) : (
    <>
      Em {spanWords(last.date - from.date)}, {subject} foi de <Chip>{withUnit(from.value)}</Chip> para <b>{withUnit(last.value)}</b>.
      Seu recorde segue <b>{withUnit(all[topAll].value)}</b>, de {fullDate(all[topAll].date)}.
    </>
  );

  const records = [...recordSet].reverse();
  const recent = [...all].reverse();
  const tape = { '--tape': tapeColor(workouts, sessions.find((s) => s.id === last.sessionId)?.workoutId) };

  return (
    <Page style={tape}>
      <BackLink to="/progresso" label="Progresso" />
      <section className="prose intro">
        <p>{name},</p>
        <p>{story}</p>
      </section>

      {(periods.length > 1 || canE1rm) && (
        <div className="progress-tools detail-tools">
          {periods.length > 1 ? (
            <Seg label="Período" id="period-seg" value={current[0]} onChange={setPeriod} options={periods.map(([k, l]) => [k, l])} />
          ) : <span />}
          {canE1rm && (
            <Seg
              label="Métrica"
              id="detail-metric-seg"
              value={useE1rm ? '1rm' : 'best'}
              onChange={(k) => setParams(k === '1rm' ? { metrica: '1rm' } : {}, { replace: true })}
              options={[['best', 'Carga'], ['1rm', '1RM est.']]}
            />
          )}
        </div>
      )}

      {shown.length > 1 && (
        <div className="tile tile-chart">
          <ProgressChart
            data={shown}
            top={topShown}
            format={(v) => kg(v)}
            label={`${name}: de ${withUnit(from.value)} para ${withUnit(last.value)} em ${plural(shown.length, 'treino')}`}
            readout={(p, i) =>
              i == null ? (
                <>
                  <span className="pchart-read-main"><Trophy size={14} className="gold" /> <b>{withUnit(p.value)}</b> <span className="muted">recorde · {dayMonth(p.date)}</span></span>
                  <span className="faint">toque e arraste</span>
                </>
              ) : (
                <span className="pchart-read-main">
                  {recordSet.has(offset + i) && <Trophy size={14} className="gold" />}
                  <b>{withUnit(p.value)}</b> <span className="muted">{fullDate(p.date)}</span>
                </span>
              )
            }
          />
        </div>
      )}

      {records.length > 0 && (
        <section className="list-group">
          <SectionLabel action={records.length > 3 && <ToggleAll open={allRecords} onClick={() => setAllRecords((v) => !v)} count={records.length} />}>
            Recordes
          </SectionLabel>
          <ul className="list">
            {(allRecords ? records : records.slice(0, 3)).map((i) => {
              const p = all[i];
              const before = Math.max(...all.slice(0, i).map((q) => q.value));
              return (
                <motion.li key={p.sessionId} layout="position">
                  <Link to={`/historico/${p.sessionId}`} className="list-row">
                    <span className="record-row">
                      <Trophy size={15} className="gold" />
                      <b>{withUnit(p.value)}</b>
                      <span className="up-text small">+{kg(p.value - before)}</span>
                    </span>
                    <span className="muted small">{fullDate(p.date)}</span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="list-group">
        <SectionLabel action={recent.length > 5 && <ToggleAll open={allSessions} onClick={() => setAllSessions((v) => !v)} count={recent.length} />}>
          Treinos
        </SectionLabel>
        <ul className="list">
          {(allSessions ? recent : recent.slice(0, 5)).map((p) => (
            <motion.li key={p.sessionId} layout="position">
              <Link to={`/historico/${p.sessionId}`} className="list-row session-row">
                <span className="session-row-date">{dayMonth(p.date)}</span>
                <span className="set-chips">
                  {p.sets.map((s, i) => <span key={i} className="set-chip mono">{setText(type, s)}</span>)}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </section>
    </Page>
  );
}

function Seg({ label, id, value, onChange, options }) {
  return (
    <div className="seg metric-seg" role="radiogroup" aria-label={label}>
      {options.map(([k, text]) => (
        <button key={k} role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {value === k && <motion.span layoutId={id} className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span>{text}</span>
        </button>
      ))}
    </div>
  );
}

function ToggleAll({ open, onClick, count }) {
  return <button className="chip chip-action" onClick={onClick}>{open ? 'ver menos' : `ver todos (${count})`}</button>;
}
