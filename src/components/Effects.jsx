import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { beep, notify, unlockAudio, vibrate } from '../lib/alerts';
import { thisWeekCount, weekStreak } from '../lib/records';

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const subscribeDark = (cb) => { darkQuery.addEventListener('change', cb); return () => darkQuery.removeEventListener('change', cb); };

/** Tema efetivo: o escolhido, ou o do sistema. */
export function useResolvedTheme() {
  const theme = useStore((s) => s.settings.theme);
  const systemDark = useSyncExternalStore(subscribeDark, () => darkQuery.matches);
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

/** Efeitos globais sem interface: tema, fim do descanso, tela acesa e áudio. */
export default function Effects() {
  const theme = useResolvedTheme();
  const { pathname } = useLocation();
  const hasActive = useStore((s) => !!s.active);
  const wakeLockOn = useStore((s) => s.settings.wakeLock);
  const sessions = useStore((s) => s.sessions);
  const badge = useStore((s) => s.settings.badge);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0a0a0b' : '#fafafa');
  }, [theme]);

  // Fim do descanso: confere 4x por segundo e também quando o app volta para a tela.
  useEffect(() => {
    const check = () => {
      const { active, settings, endRest, showToast } = useStore.getState();
      if (!active?.restEnd || Date.now() < active.restEnd) return;
      endRest();
      showToast('Descanso acabou — bora! 💪');
      if (settings.vibrate) vibrate([300, 150, 300, 150, 300]);
      if (settings.sound) beep();
      notify('Descanso acabou!', 'Bora pra próxima série 💪');
    };
    const t = setInterval(check, 250);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); };
  }, []);

  // Mantém a tela acesa durante o treino.
  useEffect(() => {
    if (!hasActive || !wakeLockOn || pathname !== '/sessao' || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || lock) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
        if (cancelled) lock.release();
      } catch {}
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', acquire); lock?.release(); };
  }, [hasActive, wakeLockOn, pathname]);

  // Número no ícone do app (iPhone com notificações ativadas; Android depende do launcher).
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    const n = badge === 'streak' ? weekStreak(sessions) : badge === 'week' ? thisWeekCount(sessions) : 0;
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }, [sessions, badge]);

  useEffect(() => {
    addEventListener('pointerdown', unlockAudio, { once: true });
  }, []);

  // volta ao topo antes de desenhar a tela nova, para não dar um pulo depois
  useLayoutEffect(() => { scrollTo(0, 0); }, [pathname]);

  return null;
}
