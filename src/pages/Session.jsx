import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown, ArrowUp, Calculator, Check, ChevronDown, Flame, Minus, MoreHorizontal, Plus, Repeat, StickyNote, Timer, Trash2, TrendingUp,
} from 'lucide-react';
import { useStore } from '../store';
import { Page, BackLink } from '../components/ui';
import { Sheet } from '../components/Overlays';
import PlateCalc from '../components/PlateCalc';
import { tapeColor } from '../components/Cassette';
import { useNow } from '../lib/hooks';
import { clock, doneSets, kg, num, restLabel, totalSets } from '../lib/format';
import { TYPES, knownExercises } from '../lib/exercises';
import { prevText } from '../lib/records';
import { vibrate } from '../lib/alerts';
import { confirmDialog, promptDialog } from '../lib/confirm';

const isComplete = (e) => e.sets.every((s) => s.done);

export default function Session() {
  const active = useStore((s) => s.active);
  const workouts = useStore((s) => s.workouts);
  const sessions = useStore((s) => s.sessions);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const addActiveExercise = useStore((s) => s.addActiveExercise);
  const setSessionNote = useStore((s) => s.setSessionNote);
  const withUndo = useStore((s) => s.withUndo);
  const navigate = useNavigate();
  // O React Router troca de tela de forma adiada (transição); enquanto isso o treino já foi limpo.
  // Este ref evita que o <Navigate> abaixo mande para o início no meio do caminho.
  const leaving = useRef(false);
  const leave = (to, state) => { leaving.current = true; navigate(to, { state }); };
  // Só um exercício fica aberto: o primeiro não concluído, ou o que a pessoa tocou (-1 = todos fechados).
  const [opened, setOpened] = useState(null);

  if (!active) return leaving.current ? null : <Navigate to="/" replace />;

  const done = doneSets(active), total = totalSets(active);
  const current = active.exercises.findIndex((e) => !isComplete(e));
  const expanded = opened ?? current;
  const tape = { '--tape': tapeColor(workouts, active.workoutId) };

  // Ao concluir o exercício aberto: fecha e desce até o próximo pendente.
  const onComplete = () => {
    setOpened(null);
    const next = useStore.getState().active?.exercises.findIndex((e) => !isComplete(e));
    if (next >= 0) setTimeout(() => document.getElementById(`ex-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 380);
  };

  const finish = async () => {
    if (!done) {
      const ok = await confirmDialog({
        title: 'Nenhuma série marcada',
        body: 'Sem séries feitas não há o que salvar. Descartar este treino?',
        confirmLabel: 'Descartar',
        danger: true,
      });
      if (ok) { leave('/'); discardWorkout(); }
      return;
    }
    if (done < total && !(await confirmDialog({
      title: 'Finalizar treino?',
      body: `Você fez ${done} de ${total} séries. As que não foram marcadas não serão salvas.`,
      confirmLabel: 'Finalizar',
    }))) return;
    leave(`/historico/${active.id}`, { justFinished: true });
    finishWorkout();
  };

  const discard = () => {
    leave('/');
    withUndo('Treino descartado', discardWorkout);
  };

  const addExercise = async () => {
    const name = await promptDialog({
      title: 'Adicionar exercício',
      placeholder: 'Nome do exercício',
      confirmLabel: 'Adicionar',
      suggestions: knownExercises(sessions),
    });
    if (name?.trim()) addActiveExercise(name);
  };

  return (
    <>
    <Page className="page-session" style={tape}>
      <BackLink />
      <SessionHeader active={active} done={done} total={total} />
      <AnimatePresence initial={false}>
        {active.exercises.map((e, ei) => (
          <ExerciseCard
            key={`${e.exId}-${e.name}`}
            exercise={e}
            ei={ei}
            count={active.exercises.length}
            expanded={expanded === ei}
            onToggleOpen={() => setOpened(expanded === ei ? -1 : ei)}
            onComplete={onComplete}
          />
        ))}
      </AnimatePresence>

      <motion.button whileTap={{ scale: 0.98 }} className="btn btn-dashed wide" onClick={addExercise}>
        <Plus size={16} /> Adicionar exercício
      </motion.button>

      <textarea
        className="session-note"
        value={active.note || ''}
        onChange={(e) => setSessionNote(e.target.value)}
        placeholder="Anotações do treino (ex.: dormi mal, ombro incomodando…)"
        aria-label="Anotações do treino"
        rows={2}
      />

      <div className="stack-actions">
        <button className="btn btn-text danger" onClick={discard}>Descartar treino</button>
      </div>
    </Page>
    <SessionBar done={done} total={total} onFinish={finish} style={tape} />
    </>
  );
}

/** Barra fixa no lugar do dock: progresso das séries e o botão de finalizar sempre à mão. */
function SessionBar({ done, total, onFinish, style }) {
  const ready = total > 0 && done === total;
  return (
    <motion.div
      className="session-bar"
      style={style}
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <div className="session-bar-info">
        <span className="mono"><b>{done}</b>/{total} séries</span>
        <span className="session-bar-track"><i style={{ transform: `scaleX(${total ? done / total : 0})` }} /></span>
      </div>
      <motion.button whileTap={{ scale: 0.95 }} className={`btn btn-primary session-finish ${ready ? 'ready' : ''}`} onClick={onFinish}>
        <Check size={16} /> Finalizar
      </motion.button>
    </motion.div>
  );
}

function SessionHeader({ active, done, total }) {
  const now = useNow(1000);
  return (
    <header className="session-head">
      <h1>{active.name}</h1>
      <div className="session-clock mono">{clock((now - active.start) / 1000, { pad: true })}</div>
      {/* um tracinho por série; os feitos ficam preenchidos */}
      <div className="ticks" aria-label={`${done} de ${total} séries feitas`}>
        {active.exercises.flatMap((e, ei) =>
          e.sets.map((s, si) => (s.warmup ? null : <i key={`${ei}-${si}`} className={s.done ? 'on' : ''} />))
        )}
      </div>
      <p className="small muted mono">{done}/{total} séries</p>
    </header>
  );
}

function ExerciseCard({ exercise: e, ei, count, expanded, onToggleOpen, onComplete }) {
  const sessions = useStore((s) => s.sessions);
  const startRest = useStore((s) => s.startRest);
  const addSet = useStore((s) => s.addSet);
  const addWarmupSet = useStore((s) => s.addWarmupSet);
  const removeSet = useStore((s) => s.removeSet);
  const applySuggestion = useStore((s) => s.applySuggestion);
  const setExerciseNote = useStore((s) => s.setExerciseNote);
  const replaceActiveExercise = useStore((s) => s.replaceActiveExercise);
  const removeActiveExercise = useStore((s) => s.removeActiveExercise);
  const moveActiveExercise = useStore((s) => s.moveActiveExercise);
  const withUndo = useStore((s) => s.withUndo);
  const [menu, setMenu] = useState(false);
  const [plates, setPlates] = useState(false);

  const { a, b } = TYPES[e.type];
  const allDone = e.sets.every((s) => s.done);
  const pending = e.sets.filter((s) => !s.done && !s.warmup);
  const showSuggest = e.suggest && pending.length > 0 && pending.some((s) => (s.weight ?? 0) < e.suggest.weight);
  const currentWeight = pending[0]?.weight ?? e.sets.at(-1)?.weight;
  const rows = labelSets(e);
  const hasPrev = rows.some((r) => r.prev);
  const work = e.sets.filter((s) => !s.warmup);

  // chamado depois de marcar uma série: se foi a última do exercício, avisa a tela
  const afterCheck = () => {
    const now = useStore.getState().active?.exercises[ei];
    if (now && isComplete(now)) onComplete();
  };

  const editNote = async () => {
    setMenu(false);
    const note = await promptDialog({
      title: 'Anotação',
      body: 'Fica salva no treino e aparece da próxima vez.',
      initial: e.note,
      placeholder: 'Ex.: banco na posição 4, pegada fechada',
      multiline: true,
    });
    if (note != null) setExerciseNote(ei, note.trim());
  };

  const replace = async () => {
    setMenu(false);
    const name = await promptDialog({
      title: 'Trocar exercício',
      body: `No lugar de “${e.name}”. As séries feitas dele serão descartadas.`,
      placeholder: 'Novo exercício',
      confirmLabel: 'Trocar',
      suggestions: knownExercises(sessions),
    });
    if (name?.trim()) replaceActiveExercise(ei, name);
  };

  const remove = () => {
    setMenu(false);
    withUndo(`${e.name} removido`, () => removeActiveExercise(ei));
  };

  return (
    <motion.section
      id={`ex-${ei}`}
      className={`card ex-card ${allDone ? 'complete' : ''} ${expanded ? 'open' : 'closed'}`}
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
    >
      {!expanded ? (
        <button className="ex-collapsed" onClick={onToggleOpen} aria-expanded="false" aria-label={`Abrir ${e.name}`}>
          <span className={`ex-status mono ${allDone ? 'done' : ''}`}>{allDone ? <Check size={15} strokeWidth={3} /> : ei + 1}</span>
          <span className="grow">
            <b>{e.name}</b>
            <small className="mono">{work.filter((s) => s.done).length}/{work.length} séries · {restLabel(e.rest)}</small>
          </span>
          <span className="ex-dots" aria-hidden="true">
            {work.map((s, i) => <i key={i} className={s.done ? 'on' : ''} />)}
          </span>
          <ChevronDown size={16} className="faint" />
        </button>
      ) : (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden' }}>
      <div className="ex-card-head">
        <button className="ex-title" onClick={onToggleOpen} aria-expanded="true">
          <span className="ex-status mono">{ei + 1}</span>
          <h2>{e.name}</h2>
        </button>
        <motion.button whileTap={{ scale: 0.92 }} className="chip chip-action mono" onClick={() => startRest(e.rest, e.name)} aria-label="Iniciar descanso">
          <Timer size={13} /> {restLabel(e.rest)}
        </motion.button>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label={`Opções de ${e.name}`}><MoreHorizontal size={17} /></button>
      </div>

      {e.note && <button className="ex-note" onClick={editNote}>{e.note}</button>}

      <AnimatePresence>
        {showSuggest && (
          <motion.div className="suggest" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="suggest-inner">
              <TrendingUp size={15} />
              <span className="grow">
                Da última vez você fez todas as reps com {kg(e.suggest.from)} kg. Tente <b>{kg(e.suggest.weight)} kg</b>.
              </span>
              <button className="chip chip-action" onClick={() => applySuggestion(ei)}>aplicar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* a coluna "anterior" só aparece quando já existe histórico deste exercício */}
      <div className={`set-grid set-grid-head ${hasPrev ? '' : 'no-prev'}`}>
        <span>#</span>{hasPrev && <span>anterior</span>}<span>{a.short}</span><span>{b.short}</span><span />
      </div>
      {rows.map(({ set, label, prev }, si) => (
        <SetRow key={si} set={set} label={label} prev={prev} showPrev={hasPrev} type={e.type} ei={ei} si={si} canWarmup={e.type === 'weight'} onChecked={afterCheck} />
      ))}
      <div className="ex-card-foot">
        <button className="btn btn-ghost" onClick={() => addSet(ei)}><Plus size={15} /> série</button>
        <button className="btn btn-ghost" onClick={() => removeSet(ei)} disabled={e.sets.length <= 1}><Minus size={15} /> série</button>
      </div>
      </motion.div>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title={e.name}>
        <div className="menu-list">
          {a.key === 'weight' && e.type === 'weight' && (
            <button onClick={() => { setMenu(false); setPlates(true); }}><Calculator size={17} /> Calculadora de anilhas</button>
          )}
          {e.type === 'weight' && (
            <button onClick={() => { addWarmupSet(ei); setMenu(false); }}><Flame size={17} /> Adicionar série de aquecimento</button>
          )}
          <button onClick={editNote}><StickyNote size={17} /> {e.note ? 'Editar anotação' : 'Adicionar anotação'}</button>
          <button onClick={replace}><Repeat size={17} /> Trocar exercício</button>
          <button onClick={() => { moveActiveExercise(ei, -1); setMenu(false); }} disabled={ei === 0}><ArrowUp size={17} /> Mover para cima</button>
          <button onClick={() => { moveActiveExercise(ei, 1); setMenu(false); }} disabled={ei === count - 1}><ArrowDown size={17} /> Mover para baixo</button>
          <button className="danger" onClick={remove} disabled={count <= 1}><Trash2 size={17} /> Remover deste treino</button>
        </div>
      </Sheet>
      <PlateCalc open={plates} onClose={() => setPlates(false)} initial={currentWeight} />
    </motion.section>
  );
}

/** Numera as séries válidas (1, 2, 3…) e marca as de aquecimento com "A", cada uma com seu "anterior". */
function labelSets(e) {
  let work = 0, warm = 0;
  return e.sets.map((set) =>
    set.warmup
      ? { set, label: 'A', prev: e.prevWarm?.[warm++] }
      : { set, label: String(++work), prev: e.prev?.[work - 1] }
  );
}

const CHECK = 'M5 12.5l4.2 4.2L19 7';

function SetRow({ set: s, label, prev, showPrev, type, ei, si, canWarmup, onChecked }) {
  const setSetField = useStore((st) => st.setSetField);
  const toggleSet = useStore((st) => st.toggleSet);
  const toggleWarmup = useStore((st) => st.toggleWarmup);
  const { a, b } = TYPES[type];
  const toggle = () => {
    toggleSet(ei, si);
    if (!s.done) {
      vibrate(25);
      onChecked();
    }
  };
  const field = (f, fieldLabel) => (
    <input
      className="mono"
      type="number"
      inputMode="decimal"
      step={f.step}
      value={s[f.key] ?? ''}
      placeholder="—"
      onChange={(ev) => setSetField(ei, si, f.key, num(ev.target.value))}
      onFocus={(ev) => ev.target.select()}
      aria-label={`${fieldLabel} da série ${s.warmup ? 'de aquecimento' : label}`}
    />
  );

  return (
    <motion.div className={`set-grid set-row ${s.done ? 'done' : ''} ${s.warmup ? 'warm' : ''} ${showPrev ? '' : 'no-prev'}`} layout="position">
      {canWarmup ? (
        <button
          className="set-n mono"
          onClick={() => toggleWarmup(ei, si)}
          aria-label={s.warmup ? 'Série de aquecimento — tocar para virar série válida' : `Série ${label} — tocar para virar aquecimento`}
        >
          {label}
        </button>
      ) : (
        <span className="set-n mono">{label}</span>
      )}
      {showPrev && <span className="set-prev mono">{prevText(type, prev)}</span>}
      {field(a, a.long)}
      {field(b, b.long)}
      <motion.button
        className="set-check"
        onClick={toggle}
        whileTap={{ scale: 0.85 }}
        aria-pressed={s.done}
        aria-label={`Série ${s.warmup ? 'de aquecimento' : label} feita`}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          {/* marca apagada de fundo + marca que se "desenha" ao concluir */}
          <path d={CHECK} opacity="0.4" />
          <motion.path
            d={CHECK}
            initial={false}
            animate={{ pathLength: s.done ? 1 : 0, opacity: s.done ? 1 : 0 }}
            transition={{ duration: 0.25 }}
          />
        </svg>
      </motion.button>
    </motion.div>
  );
}
