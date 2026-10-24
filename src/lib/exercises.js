import { uid, norm } from './format';

export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
export const WARMUP_REST_OPTIONS = [15, 30, 45, 60, 90, 120];

/** Descanso depois de uma série de aquecimento: o escolhido, ou o do exercício limitado a 1 min. */
export const warmupRestOf = (e) => e.warmupRest ?? Math.min(e.rest, 60);

/**
 * Tipos de exercício. Cada série tem dois campos: `a` (à esquerda) e `b` (à direita).
 * As chaves são as mesmas no modelo do treino (alvo) e nas séries registradas.
 */
export const TYPES = {
  weight: {
    label: 'Carga',
    a: { key: 'weight', short: 'kg', long: 'Peso · kg', step: 2.5 },
    b: { key: 'reps', short: 'reps', long: 'Reps', step: 1 },
  },
  bodyweight: {
    label: 'Corpo',
    a: { key: 'weight', short: '+kg', long: 'Extra · kg', step: 2.5 },
    b: { key: 'reps', short: 'reps', long: 'Reps', step: 1 },
  },
  time: {
    label: 'Tempo',
    a: { key: 'weight', short: '+kg', long: 'Extra · kg', step: 2.5 },
    b: { key: 'time', short: 'seg', long: 'Segundos', step: 5 },
  },
  cardio: {
    label: 'Cardio',
    a: { key: 'distance', short: 'km', long: 'Distância · km', step: 0.5 },
    b: { key: 'minutes', short: 'min', long: 'Minutos', step: 1 },
  },
};

export const typeOf = (e) => (TYPES[e?.type] ? e.type : 'weight');

/** Valores iniciais ao trocar o tipo de um exercício no editor. */
export const TYPE_DEFAULTS = {
  weight: { sets: 3, reps: 10 },
  bodyweight: { sets: 3, reps: 12, weight: null },
  time: { sets: 3, time: 30, weight: null },
  cardio: { sets: 1, minutes: 20, distance: null, rest: 60 },
};

// Tipo sugerido automaticamente para exercícios conhecidos.
const KNOWN_TYPES = {
  'prancha': 'time', 'prancha lateral': 'time', 'wall sit': 'time',
  'barra fixa': 'bodyweight', 'flexão': 'bodyweight', 'mergulho': 'bodyweight', 'abdominal': 'bodyweight',
  'paralelas': 'bodyweight', 'elevação de pernas': 'bodyweight',
  'esteira': 'cardio', 'bicicleta': 'cardio', 'elíptico': 'cardio', 'corrida': 'cardio',
  'escada': 'cardio', 'remo ergométrico': 'cardio', 'pular corda': 'cardio',
};
export const guessType = (name) => KNOWN_TYPES[norm(name)] || null;

export const COMMON_EXERCISES = [
  'Supino reto', 'Supino inclinado', 'Supino declinado', 'Crucifixo', 'Crossover', 'Flexão',
  'Agachamento livre', 'Agachamento hack', 'Leg press', 'Cadeira extensora', 'Mesa flexora',
  'Cadeira flexora', 'Stiff', 'Levantamento terra', 'Afundo', 'Búlgaro', 'Elevação pélvica',
  'Cadeira abdutora', 'Cadeira adutora', 'Panturrilha em pé', 'Panturrilha sentado',
  'Puxada frontal', 'Barra fixa', 'Remada curvada', 'Remada baixa', 'Remada unilateral', 'Pulldown',
  'Desenvolvimento', 'Elevação lateral', 'Elevação frontal', 'Crucifixo invertido', 'Encolhimento',
  'Rosca direta', 'Rosca alternada', 'Rosca martelo', 'Rosca scott',
  'Tríceps pulley', 'Tríceps corda', 'Tríceps testa', 'Tríceps francês', 'Mergulho', 'Paralelas',
  'Abdominal', 'Elevação de pernas', 'Prancha', 'Prancha lateral',
  'Esteira', 'Bicicleta', 'Elíptico', 'Escada', 'Remo ergométrico', 'Pular corda',
];

/** Lista para o autocompletar: comuns + tudo que já apareceu no histórico. */
export const knownExercises = (sessions) =>
  [...new Set([...COMMON_EXERCISES, ...sessions.flatMap((s) => s.exercises.map((e) => e.name))])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

export const newExercise = (name = '', sets = 3, reps = 10, weight = null, rest = 90, type = guessType(name) || 'weight') => ({
  id: uid(), name, type, sets, reps, weight, rest, note: '', warmup: 0,
  ...(type !== 'weight' ? TYPE_DEFAULTS[type] : {}),
});

const ex = newExercise;

export const sampleWorkouts = () => [
  { id: uid(), name: 'Treino A — Peito, ombro e tríceps', exercises: [
    ex('Supino reto', 4, 10, 40, 90), ex('Supino inclinado', 3, 10, 30, 90), ex('Crucifixo', 3, 12, 12, 60),
    ex('Desenvolvimento', 3, 10, 20, 90), ex('Elevação lateral', 3, 12, 8, 60), ex('Tríceps corda', 3, 12, 20, 60),
  ] },
  { id: uid(), name: 'Treino B — Costas e bíceps', exercises: [
    ex('Puxada frontal', 4, 10, 45, 90), ex('Remada baixa', 3, 10, 40, 90), ex('Remada unilateral', 3, 10, 20, 60),
    ex('Rosca direta', 3, 10, 20, 60), ex('Rosca martelo', 3, 12, 10, 60), ex('Prancha', 3, null, null, 45),
  ] },
  { id: uid(), name: 'Treino C — Pernas', exercises: [
    ex('Agachamento livre', 4, 8, 50, 120), ex('Leg press', 4, 12, 120, 90), ex('Cadeira extensora', 3, 12, 40, 60),
    ex('Mesa flexora', 3, 12, 35, 60), ex('Panturrilha em pé', 4, 15, 40, 45), ex('Esteira', 1, null, null, 60),
  ] },
];
