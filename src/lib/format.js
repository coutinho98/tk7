export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const norm = (s) => String(s || '').trim().toLowerCase();
export const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

export const kg = (n, digits = 1) =>
  n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: digits });

export function clock(sec, { pad = false } = {}) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  // horas só aparecem depois de 1h; com `pad`, os minutos ganham zero à esquerda (00:42)
  if (h) return `${pad ? String(h).padStart(2, '0') : h}:${String(m).padStart(2, '0')}:${s}`;
  return `${pad ? String(m).padStart(2, '0') : m}:${s}`;
}

export const restLabel = (sec) =>
  sec < 60 ? `${sec}s` : sec % 60 ? `${Math.floor(sec / 60)}m${sec % 60}` : `${sec / 60}min`;

export const shortDate = (ts) =>
  new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export const longDate = (ts) =>
  new Date(ts).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export function relativeDay(ts) {
  const day = (t) => new Date(t).setHours(0, 0, 0, 0);
  const diff = Math.round((day(Date.now()) - day(ts)) / 864e5);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `há ${diff} dias`;
  return `em ${shortDate(ts)}`;
}

export const volumeOf = (session) =>
  session.exercises.reduce(
    (v, e) => v + e.sets.reduce((a, s) => a + (s.done && !s.warmup ? (s.weight || 0) * (s.reps || 0) : 0), 0),
    0
  );

export const doneSets = (session) =>
  session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done && !s.warmup).length, 0);

export const totalSets = (session) => session.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0);

/** Letra que aparece na anilha: "Treino A — Peito" → "A"; senão a inicial. */
export function workoutLetter(name = '') {
  const m = name.match(/treino\s+([a-z0-9])\b/i);
  return (m ? m[1] : name.trim()[0] || '?').toUpperCase();
}

/** Nome sem o prefixo "Treino X —" para usar como subtítulo. */
export function workoutFocus(name = '') {
  return name.replace(/^treino\s+[a-z0-9]\s*[—–-]?\s*/i, '').trim() || name;
}

/** "1 treino" / "2 treinos" */
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** Duração longa por extenso: "45 minutos", "3 horas". */
export function durationWords(ms) {
  const min = Math.round(ms / 6e4);
  return min < 90 ? plural(min, 'minuto') : plural(Math.round(min / 60), 'hora');
}
