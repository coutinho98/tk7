import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { nextWorkout } from '../lib/records';

/** Rota do atalho "Próximo treino": retoma o treino em andamento ou começa o sugerido. */
export default function StartNext() {
  const navigate = useNavigate();
  useEffect(() => {
    const { active, workouts, sessions, startWorkout, showToast } = useStore.getState();
    if (active) return navigate('/sessao', { replace: true });
    const next = nextWorkout(workouts, sessions);
    if (next && startWorkout(next.id)) return navigate('/sessao', { replace: true });
    showToast(next ? 'Adicione exercícios a este treino primeiro' : 'Crie um treino primeiro');
    navigate('/', { replace: true });
  }, [navigate]);
  return null;
}
