import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { uid } from './lib/format';
import { TYPES, typeOf, guessType, newExercise, sampleWorkouts, warmupRestOf } from './lib/exercises';
import { lastSetsFor, suggestWeight, warmupSets } from './lib/records';

// Mesma chave e formato da versão 1: os dados antigos continuam valendo, e o backup também.
const KEY = 'treino:v1';

const defaults = () => ({
  workouts: [],  // modelos de treino
  sessions: [],  // treinos concluídos, mais recente primeiro
  active: null,  // treino em andamento
  body: [],      // peso corporal e medidas, mais recente primeiro
  settings: { sound: true, vibrate: true, wakeLock: true, theme: 'system', badge: 'streak' },
});

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) {
      // treino em andamento salvo por uma versão anterior: completa os campos novos
      saved.active?.exercises.forEach((e) => { e.type ||= 'weight'; e.exId ||= uid(); });
      return { ...defaults(), ...saved, settings: { ...defaults().settings, ...saved.settings } };
    }
  } catch {}
  return defaults();
}

const persisted = ({ workouts, sessions, active, body, settings }) => ({ workouts, sessions, active, body, settings });
const undoable = ({ workouts, sessions, active, body }) => ({ workouts, sessions, active, body });

/** Monta um exercício do treino em andamento a partir do modelo, já com o histórico dele. */
function buildActiveExercise(tpl, sessions) {
  const type = typeOf(tpl);
  const { a, b } = TYPES[type];
  const prev = lastSetsFor(sessions, tpl.name);
  const target = { sets: tpl.sets, reps: tpl.reps };
  // aquecimento só faz sentido em exercício com carga
  const prevWarm = type === 'weight' ? lastSetsFor(sessions, tpl.name, { warmup: true }) : null;
  const warmCount = type === 'weight' ? tpl.warmup || 0 : 0;
  const workWeight = prev?.[0]?.weight ?? tpl.weight;
  const warm = warmupSets(warmCount, workWeight, tpl.reps, prevWarm);
  return {
    exId: tpl.id,
    name: tpl.name.trim(),
    type,
    note: tpl.note || '',
    rest: tpl.rest || 90,
    warmupRest: tpl.warmupRest ?? null,
    target,
    suggest: type === 'weight' ? suggestWeight(prev, target) : null,
    prev: prev ? prev.map((s) => ({ [a.key]: s[a.key] ?? null, [b.key]: s[b.key] ?? null })) : null,
    prevWarm,
    sets: [
      ...warm,
      ...Array.from({ length: Math.max(1, tpl.sets || 1) }, (_, i) => ({
        [a.key]: prev?.[i]?.[a.key] ?? prev?.at(-1)?.[a.key] ?? tpl[a.key] ?? null,
        [b.key]: prev?.[i]?.[b.key] ?? tpl[b.key] ?? null,
        done: false,
      })),
    ],
  };
}

/** Peso da 1ª série válida — base para calcular o aquecimento. */
const firstWorkWeight = (e) => e.sets.find((s) => !s.warmup)?.weight ?? null;

function startRestDraft(active, sec, label) {
  active.restEnd = Date.now() + sec * 1000;
  active.restTotal = sec;
  active.restLabel = label || '';
}

export const useStore = create(
  immer((set, get) => ({
    ...load(),

    /* ---------- desfazer ---------- */
    toast: null,
    showToast: (msg) => set((s) => { s.toast = { msg, id: uid() }; }),

    /** Executa uma ação destrutiva e mostra um aviso com "Desfazer". */
    withUndo: (msg, fn) => {
      const snapshot = undoable(get());
      fn();
      set((s) => { s.toast = { msg, id: uid(), snapshot }; });
    },

    undo: () =>
      set((s) => {
        if (!s.toast?.snapshot) return;
        Object.assign(s, s.toast.snapshot);
        s.toast = { msg: 'Desfeito ✓', id: uid() };
      }),

    /* ---------- treinos ---------- */
    loadSample: () => set((s) => { s.workouts.push(...sampleWorkouts()); }),

    saveWorkout: (w) =>
      set((s) => {
        const i = s.workouts.findIndex((x) => x.id === w.id);
        if (i >= 0) s.workouts[i] = w;
        else s.workouts.push(w);
      }),

    deleteWorkout: (id) => set((s) => { s.workouts = s.workouts.filter((w) => w.id !== id); }),

    /* ---------- treino em andamento ---------- */
    startWorkout: (id) => {
      const { workouts, sessions } = get();
      const w = workouts.find((w) => w.id === id);
      const exercises = w.exercises.filter((e) => e.name.trim()).map((e) => buildActiveExercise(e, sessions));
      if (!exercises.length) return false;
      set((s) => {
        s.active = {
          id: uid(), workoutId: w.id, name: w.name || 'Treino', start: Date.now(), note: '',
          restEnd: null, restTotal: 0, restLabel: '', exercises,
        };
      });
      return true;
    },

    setSetField: (ei, si, field, value) => set((s) => { s.active.exercises[ei].sets[si][field] = value; }),

    /** Marca/desmarca a série. Ao marcar, já começa o descanso. */
    toggleSet: (ei, si) =>
      set((s) => {
        const e = s.active.exercises[ei];
        const st = e.sets[si];
        st.done = !st.done;
        if (!st.done) return;
        if (st.warmup) {
          startRestDraft(s.active, warmupRestOf(e), `${e.name} · aquecimento`);
        } else {
          const work = e.sets.filter((x) => !x.warmup);
          startRestDraft(s.active, e.rest, `${e.name} · ${work.indexOf(st) + 1}/${work.length}`);
        }
      }),

    addSet: (ei) =>
      set((s) => {
        const sets = s.active.exercises[ei].sets;
        const last = sets.findLast((x) => !x.warmup) || sets.at(-1);
        sets.push({ ...last, warmup: false, done: false });
      }),

    /** Nova série de aquecimento, logo depois das que já existem. */
    addWarmupSet: (ei) =>
      set((s) => {
        const e = s.active.exercises[ei];
        const count = e.sets.filter((x) => x.warmup).length;
        const work = firstWorkWeight(e);
        const weight = work ? Math.max(2.5, Math.round((work * 0.5) / 2.5) * 2.5) : null;
        e.sets.splice(count, 0, { warmup: true, weight, reps: e.target?.reps ?? 10, done: false });
      }),

    /** Alterna uma série entre aquecimento e válida. */
    toggleWarmup: (ei, si) => set((s) => { const st = s.active.exercises[ei].sets[si]; st.warmup = !st.warmup; }),

    removeSet: (ei) =>
      set((s) => {
        const sets = s.active.exercises[ei].sets;
        // remove a última série válida, mantendo pelo menos uma
        const i = sets.findLastIndex((x) => !x.warmup);
        if (sets.filter((x) => !x.warmup).length > 1) sets.splice(i, 1);
      }),

    /** Coloca a carga sugerida em todas as séries que ainda não foram feitas. */
    applySuggestion: (ei) =>
      set((s) => {
        const e = s.active.exercises[ei];
        e.sets.forEach((st) => { if (!st.done && !st.warmup) st.weight = e.suggest.weight; });
      }),

    addActiveExercise: (name) => {
      const tpl = newExercise(name.trim());
      set((s) => { s.active.exercises.push(buildActiveExercise(tpl, get().sessions)); });
    },

    /** Troca um exercício por outro (ex.: aparelho ocupado), mantendo o número de séries. */
    replaceActiveExercise: (ei, name) => {
      const old = get().active.exercises[ei];
      const type = guessType(name) || old.type;
      const tpl = { ...newExercise(name.trim(), old.sets.length, old.target?.reps, null, old.rest, type), sets: old.sets.length };
      set((s) => { s.active.exercises[ei] = buildActiveExercise(tpl, get().sessions); });
    },

    removeActiveExercise: (ei) => set((s) => { s.active.exercises.splice(ei, 1); }),

    moveActiveExercise: (ei, dir) =>
      set((s) => {
        const list = s.active.exercises, j = ei + dir;
        if (j < 0 || j >= list.length) return;
        [list[ei], list[j]] = [list[j], list[ei]];
      }),

    /** A anotação do exercício fica salva também no modelo do treino, para aparecer da próxima vez. */
    setExerciseNote: (ei, note) =>
      set((s) => {
        const e = s.active.exercises[ei];
        e.note = note;
        const tpl = s.workouts.find((w) => w.id === s.active.workoutId)?.exercises.find((x) => x.id === e.exId);
        if (tpl) tpl.note = note;
      }),

    // muda o descanso do aquecimento no treino em andamento e também no modelo do treino
    setWarmupRest: (ei, sec) =>
      set((s) => {
        const e = s.active.exercises[ei];
        e.warmupRest = sec;
        const tpl = s.workouts.find((w) => w.id === s.active.workoutId)?.exercises.find((x) => x.id === e.exId);
        if (tpl) tpl.warmupRest = sec;
      }),

    setSessionNote: (note) => set((s) => { s.active.note = note; }),

    startRest: (sec, label) => set((s) => { startRestDraft(s.active, sec, label); }),

    adjustRest: (delta) =>
      set((s) => {
        const a = s.active;
        if (!a?.restEnd) return;
        a.restEnd = Math.max(Date.now() + 1000, a.restEnd + delta * 1000);
        a.restTotal = Math.max(1, a.restTotal + delta);
      }),

    endRest: () => set((s) => { if (s.active) s.active.restEnd = null; }),

    /** Salva no histórico. Retorna o id da sessão salva. */
    finishWorkout: () => {
      const a = get().active;
      const session = {
        id: a.id, workoutId: a.workoutId, name: a.name, start: a.start, end: Date.now(), note: a.note?.trim() || '',
        exercises: a.exercises
          .map((e) => ({ name: e.name, type: e.type, note: e.note || '', sets: e.sets.filter((x) => x.done) }))
          .filter((e) => e.sets.length),
      };
      set((s) => { s.sessions.unshift(session); s.active = null; });
      return session.id;
    },

    discardWorkout: () => set((s) => { s.active = null; }),

    /* ---------- histórico ---------- */
    updateSession: (session) =>
      set((s) => {
        s.sessions = s.sessions.map((x) => (x.id === session.id ? session : x)).sort((a, b) => b.start - a.start);
      }),

    deleteSession: (id) => set((s) => { s.sessions = s.sessions.filter((x) => x.id !== id); }),

    /* ---------- corpo ---------- */
    saveBody: (entry) =>
      set((s) => {
        const i = s.body.findIndex((x) => x.id === entry.id);
        if (i >= 0) s.body[i] = entry;
        else s.body.push(entry);
        s.body.sort((a, b) => b.date - a.date);
      }),

    deleteBody: (id) => set((s) => { s.body = s.body.filter((x) => x.id !== id); }),

    /* ---------- ajustes ---------- */
    setSetting: (key, value) => set((s) => { s.settings[key] = value; }),

    importData: (data) => {
      if (!Array.isArray(data?.workouts) || !Array.isArray(data?.sessions)) throw new Error('inválido');
      set(() => ({ ...defaults(), ...data, settings: { ...defaults().settings, ...data.settings } }));
    },

    wipe: () => set(() => ({ ...defaults(), settings: get().settings })),

    exportData: () => JSON.stringify(persisted(get()), null, 2),
  }))
);

// Salva no aparelho sempre que algo muda.
let lastSaved;
useStore.subscribe((s) => {
  const json = JSON.stringify(persisted(s));
  if (json !== lastSaved) localStorage.setItem(KEY, (lastSaved = json));
});
