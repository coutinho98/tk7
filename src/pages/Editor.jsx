import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../store';
import { Page, BackLink, RestPick, SectionLabel, Stepper } from '../components/ui';
import { REST_OPTIONS, TYPES, TYPE_DEFAULTS, WARMUP_REST_OPTIONS, guessType, knownExercises, newExercise, typeOf, warmupRestOf } from '../lib/exercises';
import { uid } from '../lib/format';
import { confirmDialog } from '../lib/confirm';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workouts = useStore((s) => s.workouts);
  const sessions = useStore((s) => s.sessions);
  const saveWorkout = useStore((s) => s.saveWorkout);
  const deleteWorkout = useStore((s) => s.deleteWorkout);
  const showToast = useStore((s) => s.showToast);

  const existing = workouts.find((w) => w.id === id);
  const [draft, setDraft] = useState(() =>
    existing ? structuredClone(existing) : { id: uid(), name: '', exercises: [newExercise()] }
  );

  const known = knownExercises(sessions);

  const setName = (name) => setDraft((d) => ({ ...d, name }));
  const setExercises = (exercises) => setDraft((d) => ({ ...d, exercises }));
  const patchExercise = (exId, patch) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) }));

  const save = () => {
    const w = { ...draft, name: draft.name.trim(), exercises: draft.exercises.filter((e) => e.name.trim()) };
    if (!w.name) return showToast('Dê um nome ao treino');
    if (!w.exercises.length) return showToast('Adicione pelo menos um exercício');
    saveWorkout(w);
    showToast('Treino salvo ✓');
    navigate('/');
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Excluir este treino?',
      body: 'O histórico dos treinos já feitos continua salvo.',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    deleteWorkout(draft.id);
    navigate('/');
  };

  return (
    <Page>
      <BackLink />
      <textarea
        className="title-input"
        value={draft.name}
        onChange={(e) => setName(e.target.value.replace(/\n/g, ''))}
        placeholder="Nome do treino"
        aria-label="Nome do treino"
        autoFocus={!existing}
        rows={1}
      />
      <p className="muted small hint">Ex.: “Treino A — Peito e tríceps”. A letra vira a anilha do treino.</p>

      <SectionLabel>Exercícios · {draft.exercises.length}</SectionLabel>
      <Reorder.Group axis="y" values={draft.exercises} onReorder={setExercises} className="ex-edit-list">
        <AnimatePresence initial={false}>
          {draft.exercises.map((e, i) => (
            <ExerciseItem
              key={e.id}
              exercise={e}
              index={i}
              onChange={(patch) => patchExercise(e.id, patch)}
              onRemove={() => setExercises(draft.exercises.filter((x) => x.id !== e.id))}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <datalist id="ex-names">{known.map((n) => <option key={n} value={n} />)}</datalist>

      <motion.button whileTap={{ scale: 0.98 }} className="btn btn-dashed wide" onClick={() => setExercises([...draft.exercises, newExercise()])}>
        <Plus size={16} /> Adicionar exercício
      </motion.button>

      <div className="stack-actions">
        <motion.button whileTap={{ scale: 0.98 }} className="btn btn-primary wide" onClick={save}>Salvar treino</motion.button>
        {existing && (
          <button className="btn btn-text danger" onClick={remove}><Trash2 size={15} /> Excluir treino</button>
        )}
      </div>
    </Page>
  );
}

function ExerciseItem({ exercise: e, index, onChange, onRemove }) {
  const controls = useDragControls();
  const type = typeOf(e);
  const { a, b } = TYPES[type];

  const changeName = (name) => {
    const guessed = guessType(name);
    onChange(guessed && guessed !== type ? { name, type: guessed, ...TYPE_DEFAULTS[guessed] } : { name });
  };

  return (
    <Reorder.Item
      value={e}
      dragListener={false}
      dragControls={controls}
      className="ex-edit"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileDrag={{ scale: 1.02, boxShadow: '0 18px 40px rgba(0,0,0,.14)' }}
    >
      <div className="ex-edit-head">
        <button className="grip" onPointerDown={(ev) => controls.start(ev)} aria-label="Arrastar para reordenar" type="button">
          <GripVertical size={16} />
        </button>
        <span className="ex-index mono">{String(index + 1).padStart(2, '0')}</span>
        <input
          className="ex-name"
          list="ex-names"
          value={e.name}
          onChange={(ev) => changeName(ev.target.value)}
          placeholder="Nome do exercício"
          aria-label="Nome do exercício"
        />
        <button className="icon-btn" onClick={onRemove} aria-label="Remover exercício" type="button"><X size={15} /></button>
      </div>

      <div className="type-pick" role="radiogroup" aria-label="Tipo do exercício">
        {Object.entries(TYPES).map(([key, t]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={type === key}
            className={type === key ? 'on' : ''}
            onClick={() => key !== type && onChange({ type: key, ...TYPE_DEFAULTS[key] })}
          >
            {type === key && <motion.span layoutId={`type-${e.id}`} className="seg-knob" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="steppers">
        <Stepper label="Séries" value={e.sets} min={1} onChange={(v) => onChange({ sets: v })} />
        <Stepper label={b.long} value={e[b.key]} min={0} step={b.step} onChange={(v) => onChange({ [b.key]: v })} />
        <Stepper label={a.long.split(' · ')[0]} suffix={a.long.split(' · ')[1]} value={e[a.key]} step={a.step} onChange={(v) => onChange({ [a.key]: v })} />
      </div>

      {type === 'weight' && (
        <div className="warm-row">
          <div>
            <span>Aquecimento</span>
            <small>séries leves antes; não contam no volume</small>
          </div>
          <div className="stepper-body">
            <button type="button" onClick={() => onChange({ warmup: Math.max(0, (e.warmup || 0) - 1) })} aria-label="Menos séries de aquecimento">−</button>
            <span className="mono warm-count">{e.warmup || 0}</span>
            <button type="button" onClick={() => onChange({ warmup: Math.min(5, (e.warmup || 0) + 1) })} aria-label="Mais séries de aquecimento">+</button>
          </div>
        </div>
      )}

      {type === 'weight' && e.warmup > 0 && (
        <RestPick label="Descanso do aquecimento" options={WARMUP_REST_OPTIONS} value={warmupRestOf(e)} onChange={(s) => onChange({ warmupRest: s })} />
      )}

      <RestPick label={e.warmup > 0 && type === 'weight' ? 'Descanso das séries' : 'Descanso'} options={REST_OPTIONS} value={e.rest} onChange={(s) => onChange({ rest: s })} />

      <input
        className="note-input"
        value={e.note || ''}
        onChange={(ev) => onChange({ note: ev.target.value })}
        placeholder="Anotação (ex.: banco na posição 4)"
        aria-label="Anotação do exercício"
      />
    </Reorder.Item>
  );
}

