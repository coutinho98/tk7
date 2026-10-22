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

const WARMUP_PCTS = { 1: [0.6], 2: [0.5, 0.75], 3: [0.4, 0.6, 0.8] };

/** Séries de aquecimento: repete as da última vez ou usa uma fração da carga de trabalho. */
export function warmupSets(count, workWeight, workReps, prevWarm) {
  return Array.from({ length: count }, (_, i) => {
    const pct = WARMUP_PCTS[count]?.[i] ?? 0.5;
    const guess = workWeight ? Math.max(2.5, Math.round((workWeight * pct) / 2.5) * 2.5) : null;
    return { warmup: true, weight: prevWarm?.[i]?.weight ?? guess, reps: prevWarm?.[i]?.reps ?? workReps ?? 10, done: false };
  });
}

/**
 * Sugestão de progressão: se da última vez você fez todas as séries com todas as
 * repetições do alvo, sugere subir a carga.
 */
export function suggestWeight(prevSets, target) {
  if (!prevSets?.length || !target?.reps) return null;
  const top = maxOf(prevSets.map((s) => s.weight));
  if (top == null || top <= 0) return null;
  const enoughSets = prevSets.length >= (target.sets || 1);
  const allReps = prevSets.every((s) => (s.reps || 0) >= target.reps);
  if (!enoughSets || !allReps) return null;
  return { from: top, weight: top + (top >= 20 ? 2.5 : 1) };
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
