import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Minus, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react';
import { useStore } from '../store';
import { Page, BackLink, Stepper } from '../components/ui';
import Cassette, { TAPE_COLORS } from '../components/Cassette';
import { clock, doneSets, kg, longDate, num, plural, relativeDay, volumeOf, workoutFocus, workoutLetter } from '../lib/format';
import { TYPES, typeOf } from '../lib/exercises';
import { compareSessions, previousOfSameWorkout, recordsIn, setText } from '../lib/records';

export default function SessionDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const sessions = useStore((s) => s.sessions);
  const [editing, setEditing] = useState(false);

  const records = useMemo(() => (session ? recordsIn(session, sessions) : []), [session, sessions]);
  const compare = useMemo(() => session && compareSessions(session, previousOfSameWorkout(session, sessions)), [session, sessions]);

  if (!session) {
    return (
      <Page>
        <BackLink to="/historico" label="Histórico" />
        <p className="muted">Treino não encontrado.</p>
      </Page>
    );
  }

  if (editing) return <EditSession session={session} onDone={() => setEditing(false)} />;

  const time = new Date(session.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const recordNames = new Set(records.map((r) => r.name));

  return (
    <Page>
      <BackLink to="/historico" label="Histórico" />

      {state?.justFinished && <FinishHero session={session} records={records} />}

      <header className="detail-head">
        <p className="muted small">{longDate(session.start)} · {time}</p>
        <h1>{session.name}</h1>
      </header>

      <div className="stats">
        <Stat value={clock((session.end - session.start) / 1000)} label="duração" />
        <Stat value={doneSets(session)} label="séries" />
        <Stat value={kg(volumeOf(session))} label="kg de volume" />
      </div>

      {compare && <Compare compare={compare} />}

      {records.length > 0 && !state?.justFinished && (
        <div className="records-line">
          <Trophy size={15} /> {plural(records.length, 'recorde')} neste treino
        </div>
      )}

      {session.note && <p className="session-note-view">“{session.note}”</p>}

      {session.exercises.map((e) => {
        const type = typeOf(e);
        return (
          <section key={e.name} className="card detail-ex">
            <h2>
              {e.name}
              {recordNames.has(e.name) && <span className="pr-badge"><Trophy size={12} /> recorde</span>}
            </h2>
            {e.note && <p className="ex-note static">{e.note}</p>}
            <div className="set-chips">
              {(() => {
                let n = 0;
                return e.sets.map((s, i) => (
                  <span key={i} className={`set-chip mono ${s.warmup ? 'warm' : ''}`}>
                    <i>{s.warmup ? 'A' : ++n}</i>{setText(type, s)}
                  </span>
                ));
              })()}
            </div>
          </section>
        );
      })}

      <div className="stack-actions">
        <button className="btn wide" onClick={() => setEditing(true)}><Pencil size={15} /> Editar treino</button>
        <DeleteButton id={session.id} />
      </div>
    </Page>
  );
}

function DeleteButton({ id }) {
  const navigate = useNavigate();
  const withUndo = useStore((s) => s.withUndo);
  const deleteSession = useStore((s) => s.deleteSession);
  const remove = () => {
    withUndo('Treino excluído do histórico', () => deleteSession(id));
    navigate('/historico');
  };
  return <button className="btn btn-text danger" onClick={remove}><Trash2 size={15} /> Excluir do histórico</button>;
}

/** Comemoração logo depois de finalizar o treino. */
function FinishHero({ session, records }) {
  const index = useStore((s) => s.workouts.findIndex((w) => w.id === session.workoutId));
  return (
    <motion.section
      className="finish-hero"
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className="finish-plate">
        <Cassette
          letter={workoutLetter(session.name)}
          title={workoutFocus(session.name)}
          tracks={session.exercises.length}
          color={TAPE_COLORS[Math.max(0, index) % TAPE_COLORS.length]}
          playing
          width={190}
        />
        {records.length > 0 && <Sparks />}
      </div>
      <h2>{records.length ? 'Recorde batido! 🏆' : 'Treino concluído 💪'}</h2>
      {records.length > 0 ? (
        <ul className="finish-records">
          {records.map((r) => (
            <motion.li key={r.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <b>{r.name}</b>
              <span className="mono">{kg(r.prev)} → <b>{kg(r.value)}</b> {r.unit}</span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="muted">Mais um pra conta. Constância é o que dá resultado.</p>
      )}
    </motion.section>
  );
}

/** Partículas saindo da anilha quando tem recorde. */
function Sparks() {
  return (
    <div className="sparks" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist = 70 + (i % 3) * 18;
        return (
          <motion.i
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.4 }}
            transition={{ duration: 1.1, delay: 0.25 + (i % 4) * 0.04, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
    </div>
  );
}

function Compare({ compare }) {
  const items = [
    compare.volume != null && { v: compare.volume, text: `${compare.volume > 0 ? '+' : ''}${compare.volume}% volume` },
    compare.sets !== 0 && { v: compare.sets, text: `${compare.sets > 0 ? '+' : ''}${compare.sets} séries` },
    compare.minutes !== 0 && { v: 0, text: `${compare.minutes > 0 ? '+' : ''}${compare.minutes} min` },
  ].filter(Boolean);
  return (
    <div className="compare">
      <span className="muted small">vs. da última vez ({relativeDay(compare.date)})</span>
      <div className="compare-chips">
        {items.length ? items.map((it) => (
          <span key={it.text} className={`delta mono ${it.v > 0 ? 'up' : it.v < 0 ? 'down' : ''}`}>{it.text}</span>
        )) : <span className="delta mono">igual</span>}
      </div>
    </div>
  );
}

export function Stat({ value, label }) {
  return (
    <div className="stat">
      <b className="mono">{value}</b>
      <span>{label}</span>
    </div>
  );
}

/* ---------- edição de um treino já finalizado ---------- */

const toLocalInput = (ts) => {
  const d = new Date(ts);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function EditSession({ session, onDone }) {
  const updateSession = useStore((s) => s.updateSession);
  const showToast = useStore((s) => s.showToast);
  const [draft, setDraft] = useState(() => structuredClone(session));
  const [minutes, setMinutes] = useState(Math.max(1, Math.round((session.end - session.start) / 6e4)));

  const patch = (fn) => setDraft((d) => { const c = structuredClone(d); fn(c); return c; });

  const save = () => {
    const exercises = draft.exercises.filter((e) => e.sets.length);
    if (!exercises.length) return showToast('O treino precisa de pelo menos uma série');
    updateSession({ ...draft, exercises, end: draft.start + Math.max(1, minutes || 0) * 6e4 });
    showToast('Treino atualizado ✓');
    onDone();
  };

  return (
    <Page>
      <button className="back" onClick={onDone}><X size={16} /> Cancelar edição</button>
      <textarea className="title-input" rows={1} value={draft.name} onChange={(e) => patch((d) => { d.name = e.target.value.replace(/\n/g, ''); })} aria-label="Nome do treino" />

      <div className="edit-meta">
        <label className="stepper">
          <span className="stepper-label">Data e hora</span>
          <input
            type="datetime-local"
            className="date-input mono"
            value={toLocalInput(draft.start)}
            onChange={(e) => e.target.value && patch((d) => { d.start = new Date(e.target.value).getTime(); })}
          />
        </label>
        <Stepper label="Duração" suffix="min" value={minutes} min={1} step={5} onChange={setMinutes} />
      </div>

      {draft.exercises.map((e, ei) => {
        const type = typeOf(e);
        const { a, b } = TYPES[type];
        return (
          <section key={ei} className="card">
            <div className="ex-card-head">
              <h2>{e.name}</h2>
              <button className="icon-btn danger" onClick={() => patch((d) => { d.exercises.splice(ei, 1); })} aria-label={`Remover ${e.name}`}>
                <Trash2 size={15} />
              </button>
            </div>
            <div className="set-grid edit-grid set-grid-head">
              <span>#</span><span>{a.short}</span><span>{b.short}</span><span />
            </div>
            {e.sets.map((s, si) => (
              <div key={si} className={`set-grid edit-grid set-row ${s.warmup ? 'warm' : ''}`}>
                <button
                  className="set-n mono"
                  onClick={() => patch((d) => { d.exercises[ei].sets[si].warmup = !s.warmup; })}
                  aria-label={s.warmup ? 'Aquecimento — tocar para virar série válida' : 'Tocar para virar aquecimento'}
                >
                  {s.warmup ? 'A' : e.sets.slice(0, si + 1).filter((x) => !x.warmup).length}
                </button>
                {[a, b].map((f) => (
                  <input
                    key={f.key}
                    className="mono"
                    type="number"
                    inputMode="decimal"
                    value={s[f.key] ?? ''}
                    placeholder="—"
                    onChange={(ev) => patch((d) => { d.exercises[ei].sets[si][f.key] = num(ev.target.value); })}
                    aria-label={`${f.long} da série ${si + 1}`}
                  />
                ))}
                <button className="icon-btn" onClick={() => patch((d) => { d.exercises[ei].sets.splice(si, 1); })} aria-label={`Remover série ${si + 1}`}>
                  <Minus size={15} />
                </button>
              </div>
            ))}
            <div className="ex-card-foot">
              <button className="btn btn-ghost" onClick={() => patch((d) => { const sets = d.exercises[ei].sets; sets.push({ ...(sets.findLast((x) => !x.warmup) || sets.at(-1) || {}), warmup: false, done: true }); })}>
                <Plus size={14} /> série
              </button>
            </div>
            <input
              className="note-input"
              value={e.note || ''}
              onChange={(ev) => patch((d) => { d.exercises[ei].note = ev.target.value; })}
              placeholder="Anotação"
              aria-label={`Anotação de ${e.name}`}
            />
          </section>
        );
      })}

      <textarea
        className="session-note"
        value={draft.note || ''}
        onChange={(e) => patch((d) => { d.note = e.target.value; })}
        placeholder="Anotações do treino"
        aria-label="Anotações do treino"
        rows={2}
      />

      <div className="stack-actions">
        <button className="btn btn-primary wide" onClick={save}>Salvar alterações</button>
      </div>
    </Page>
  );
}
