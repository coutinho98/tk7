// Cálculos sobre o histórico: recordes, 1RM, sugestão de carga, sequência e calendário.
import { norm, volumeOf, doneSets, kg } from './format';
import { TYPES, typeOf } from './exercises';

/** Métrica principal de cada tipo — usada em recordes e no progresso. */
export const METRIC = {
  weight: { label: 'carga máx.', unit: 'kg', of: (s) => s.weight },
  bodyweight: { label: 'reps máx.', unit: 'reps', of: (s) => s.reps },
  time: { label: 'tempo máx.', unit: 's', of: (s) => s.time },
  cardio: { label: 'distância', unit: 'km', of: (s) => s.distance },
};

const maxOf = (values) => {
  const v = values.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? Math.max(...v) : null;
};

/** Melhor valor da métrica principal nas séries feitas. */
export const best = (type, sets) => maxOf(sets.filter((s) => s.done && !s.warmup).map(METRIC[type].of));

/** 1RM estimado (fórmula de Epley): quanto você levantaria em uma repetição só. */
export const e1rm = (weight, reps) => (weight > 0 && reps > 0 ? (reps === 1 ? weight : weight * (1 + reps / 30)) : null);
export const bestE1rm = (sets) => maxOf(sets.filter((s) => s.done && !s.warmup).map((s) => e1rm(s.weight, s.reps)));

/** Texto de uma série: "42,5 kg × 10", "+5 kg × 12", "45 s", "3 km · 20 min". */
export function setText(type, s) {
  const t = TYPES[type];
  const a = s[t.a.key], b = s[t.b.key];
  switch (type) {
    case 'bodyweight': return `${a ? `+${kg(a)} kg × ` : ''}${b ?? '—'}${a ? '' : ' reps'}`;
    case 'time': return `${b ?? '—'} s${a ? ` · +${kg(a)} kg` : ''}`;
    case 'cardio': return [a != null && `${kg(a)} km`, b != null && `${b} min`].filter(Boolean).join(' · ') || '—';
    default: return `${kg(a)} kg × ${b ?? '—'}`;
  }
}

/** Versão curta para a coluna "anterior". */
export function prevText(type, p) {
  if (!p) return '—';
  const t = TYPES[type];
  const a = p[t.a.key], b = p[t.b.key];
  switch (type) {
    case 'bodyweight': return `${a ? `+${kg(a)}` : ''}×${b ?? '—'}`;
    case 'time': return `${b ?? '—'}s`;
    case 'cardio': return `${a != null ? `${kg(a)}km ` : ''}${b ?? '—'}m`;
    default: return `${kg(a)}×${b ?? '—'}`;
  }
}

/**
 * Séries feitas da última vez que o exercício apareceu (sessões vêm da mais recente para a mais antiga).
 * Por padrão só as válidas; com `warmup: true`, só as de aquecimento daquela mesma vez.
 */
export function lastSetsFor(sessions, name, { warmup = false } = {}) {
  const k = norm(name);
  for (const s of sessions) {
    const sets = s.exercises.find((e) => norm(e.name) === k)?.sets.filter((x) => x.done);
    if (sets?.some((x) => !x.warmup)) {
      const picked = sets.filter((x) => !!x.warmup === warmup);
      return picked.length ? picked : null;
    }
  }
  return null;
}

/**
 * As últimas `n` vezes que o exercício apareceu, da mais recente para a mais antiga:
 * `{ sets, target }` com as séries válidas feitas e o alvo daquele dia (treinos antigos não têm alvo).
 */
export function recentSetsFor(sessions, name, n = 3) {
  const k = norm(name);
  const out = [];
  for (const s of sessions) {
    const e = s.exercises.find((x) => norm(x.name) === k);
    const sets = e?.sets.filter((x) => x.done && !x.warmup);
    if (sets?.length) {
      out.push({ sets, target: e.target || null });
      if (out.length === n) break;
    }
  }
  return out;
}

/** Menor salto de carga: 2 kg em halteres leves, 2,5 kg (um par de anilhas de 1,25) no resto. */
export const loadStep = (w) => (w >= 20 ? 2.5 : 2);
const snap = (w, inc, fn = Math.round) => Math.round(fn(w / inc) * inc * 100) / 100;

/**
 * Rampa de aquecimento: cargas crescentes, repetições decrescentes, para chegar aquecido
 * sem cansar antes da série que importa. [fração da carga de trabalho, reps]
 */
const RAMP = {
  1: [[0.6, 8]],
  2: [[0.5, 8], [0.75, 5]],
  3: [[0.4, 8], [0.6, 5], [0.8, 3]],
  4: [[0.4, 10], [0.55, 6], [0.7, 4], [0.85, 2]],
  5: [[0.3, 10], [0.45, 8], [0.6, 5], [0.75, 3], [0.85, 2]],
};

/** Quantas séries de aquecimento fazem sentido para a carga: mais pesado, rampa mais longa. */
export const autoWarmupCount = (w) => (!w || w < 40 ? 1 : w < 80 ? 2 : w < 120 ? 3 : 4);

/**
 * Séries de aquecimento calculadas a partir da carga de trabalho. Pula degraus que
 * arredondariam para a mesma carga (ou que já chegariam nela). `auto` marca as geradas,
 * para recalcular quando a carga de trabalho muda.
 */
export function warmupSets(count, workWeight) {
  if (!count) return [];
  const ramp = RAMP[Math.min(5, count)];
  if (!workWeight) return ramp.map(([, reps]) => ({ warmup: true, auto: true, weight: null, reps, done: false }));
  const inc = loadStep(workWeight);
  const out = [];
  for (const [pct, reps] of ramp) {
    const weight = Math.max(inc, snap(workWeight * pct, inc));
    if (weight >= workWeight || out.some((x) => x.weight === weight)) continue;
    out.push({ warmup: true, auto: true, weight, reps, done: false });
  }
  return out;
}

/**
 * Sugestão de carga para hoje, olhando os últimos treinos do exercício (`history`, de recentSetsFor):
 * - `convert`: o alvo de repetições mudou (ou ficou bem acima do que você fez); a carga vem do 1RM estimado;
 * - `up`: da última vez fez todas as séries com todas as reps (sobrou muito? sobe dois degraus);
 * - `deload`: três treinos seguidos travado na mesma carga; recua ~10% para retomar a subida.
 */
export function suggestLoad(history, target) {
  const last = history?.[0]?.sets;
  if (!last?.length) return null;
  const top = maxOf(last.map((s) => s.weight));
  if (top == null || top <= 0) return null;
  const atTop = last.filter((s) => s.weight === top);
  const goal = target?.reps || Math.min(...atTop.map((s) => s.reps || 0));
  if (!goal) return null;
  const inc = loadStep(top);

  const lastReps = Math.max(...atTop.map((s) => s.reps || 0));
  const prevGoal = history[0].target?.reps;
  const changed = prevGoal ? prevGoal !== target?.reps : lastReps <= (target?.reps || 0) - 3;
  if (target?.reps && changed) {
    const est = maxOf(atTop.map((s) => e1rm(s.weight, s.reps)));
    const weight = snap(est / (1 + target.reps / 30), inc, Math.floor);
    if (weight > 0 && weight !== top) return { kind: 'convert', from: top, weight, e1rm: est, reps: target.reps, lastReps };
  }

  const complete = (sets) => sets.length >= (target?.sets || 1) && sets.every((s) => (s.reps || 0) >= goal);
  if (complete(last)) {
    const easy = last.every((s) => (s.reps || 0) >= goal + 3);
    return { kind: 'up', from: top, weight: snap(top + inc * (easy ? 2 : 1), inc), reps: goal, sets: last.length, easy };
  }

  const stuck = history.length >= 3 && history.slice(0, 3).every(({ sets }) => maxOf(sets.map((s) => s.weight)) === top && !complete(sets));
  if (stuck) {
    const weight = Math.max(inc, snap(top * 0.9, inc));
    if (weight < top) return { kind: 'deload', from: top, weight };
  }
  return null;
}

/** Recordes batidos numa sessão, comparando com tudo que veio antes dela. */
export function recordsIn(session, sessions) {
  const earlier = sessions.filter((s) => s.start < session.start);
  const records = [];
  for (const e of session.exercises) {
    const type = typeOf(e);
    const cur = best(type, e.sets);
    if (cur == null) continue;
    const k = norm(e.name);
    const prev = maxOf(
      earlier.flatMap((s) => s.exercises.filter((x) => norm(x.name) === k).map((x) => best(typeOf(x), x.sets)))
    );
    if (prev != null && cur > prev) records.push({ name: e.name, value: cur, prev, unit: METRIC[type].unit });
  }
  return records;
}

/** A sessão anterior do mesmo treino, para comparar. */
export function previousOfSameWorkout(session, sessions) {
  return sessions.find((s) => s.workoutId === session.workoutId && s.start < session.start) || null;
}

export function compareSessions(cur, prev) {
  if (!prev) return null;
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
  return {
    volume: pct(volumeOf(cur), volumeOf(prev)),
    sets: doneSets(cur) - doneSets(prev),
    minutes: Math.round((cur.end - cur.start - (prev.end - prev.start)) / 6e4),
    date: prev.start,
  };
}

/* ---------- calendário e sequência ---------- */

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Segunda-feira 00:00 da semana do timestamp. */
function weekStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Semanas seguidas com pelo menos um treino (a semana atual ainda não conta como quebra). */
export function weekStreak(sessions) {
  const weeks = new Set(sessions.map((s) => weekStart(s.start).getTime()));
  const w = weekStart(Date.now());
  if (!weeks.has(w.getTime())) w.setDate(w.getDate() - 7);
  let n = 0;
  while (weeks.has(w.getTime())) {
    n++;
    w.setDate(w.getDate() - 7);
  }
  return n;
}

/** Grade de dias (colunas = semanas, de segunda a domingo) para o mapa de calor. */
export function heatmap(sessions, weeks = 17) {
  const count = new Map();
  for (const s of sessions) {
    const k = dayKey(new Date(s.start));
    count.set(k, (count.get(k) || 0) + 1);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = weekStart(Date.now());
  d.setDate(d.getDate() - 7 * (weeks - 1));
  const days = [];
  for (let i = 0; i < weeks * 7; i++) {
    days.push({ date: new Date(d), count: count.get(dayKey(d)) || 0, future: d > today });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Treinos feitos na semana atual (de segunda a domingo). */
export function thisWeekCount(sessions) {
  const w = weekStart(Date.now()).getTime();
  return sessions.filter((s) => s.start >= w).length;
}

/** Sugestão de próximo treino: o que vem depois do último feito, na ordem da lista. */
export function nextWorkout(workouts, sessions) {
  if (!workouts.length) return null;
  const lastIdx = sessions[0] ? workouts.findIndex((w) => w.id === sessions[0].workoutId) : -1;
  return workouts[(lastIdx + 1) % workouts.length];
}

/* ---------- progressão por exercício ---------- */

/** Melhor marca já registrada do exercício (métrica principal, sem aquecimento). */
export function recordOf(sessions, name) {
  const k = norm(name);
  return maxOf(sessions.flatMap((s) => s.exercises.filter((x) => norm(x.name) === k).map((x) => best(typeOf(x), x.sets))));
}

/** Para cada exercício, a melhor marca em cada treino (do mais antigo ao mais recente). */
export function exerciseStats(sessions) {
  const map = new Map();
  for (const s of [...sessions].reverse()) {
    for (const e of s.exercises) {
      const type = typeOf(e);
      const value = best(type, e.sets);
      if (value == null) continue;
      const k = norm(e.name);
      if (!map.has(k)) map.set(k, { key: k, name: e.name, type, points: [] });
      map.get(k).points.push({
        date: s.start,
        sessionId: s.id,
        best: value,
        e1rm: type === 'weight' ? bestE1rm(e.sets) : null,
        sets: e.sets.filter((x) => x.done && !x.warmup),
      });
    }
  }
  return [...map.values()].sort((a, b) => b.points.at(-1).date - a.points.at(-1).date);
}

/** Índices dos pontos que bateram tudo o que veio antes (o primeiro treino não conta como recorde). */
export function recordIndexes(values) {
  const out = [];
  let top = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] != null && values[i] > top) { out.push(i); top = values[i]; }
  }
  return out;
}
