// Som, vibração e notificação de fim de descanso.

// O navegador só libera áudio depois de um toque do usuário, então o contexto é criado no primeiro toque.
let audioCtx;
export function unlockAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (Ctx) audioCtx = new Ctx();
}

export function beep() {
  if (!audioCtx) return;
  audioCtx.resume?.();
  const t0 = audioCtx.currentTime;
  [0, 0.22, 0.44].forEach((offset, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = i === 2 ? 1760 : 1320;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.14);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.16);
  });
}

export const vibrate = (pattern) => navigator.vibrate?.(pattern);

export function notify(title, body) {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  navigator.serviceWorker?.ready.then((reg) =>
    reg.showNotification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'rest',
      renotify: true,
      vibrate: [300, 150, 300],
    })
  );
}
