// Som, vibração e notificação de fim de descanso.

export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Sons do aviso. Cada voz é uma nota com timbre limpo (seno + um pouco de harmônico para o alto-falante
 * do celular), que pode deslizar de uma altura para outra: `path` = [[tempo desde o início da voz, Hz], …].
 * `taps` são os momentos (ms) da vibração; o último toque é mais longo.
 */
export const SOUNDS = {
  // uma gota que sobe e um brilho logo depois
  gota: {
    voices: [
      { at: 0, path: [[0, 784], [0.09, 1568]], decay: 0.5, gain: 1 },
      { at: 0.14, path: [[0, 2349]], decay: 0.9, gain: 0.55 },
    ],
    taps: [0, 140],
  },
  // uma nota só que escorrega por três alturas (mi, sol#, si) e se apaga devagar
  onda: {
    voices: [
      { at: 0, path: [[0, 1319], [0.1, 1319], [0.16, 1661], [0.24, 1661], [0.3, 1976]], decay: 1.25, gain: 1 },
      { at: 0.3, path: [[0, 988]], decay: 0.9, gain: 0.3 },
    ],
    taps: [0, 150, 290],
  },
  // duas bolhas que sobem e uma nota que fica
  bolha: {
    voices: [
      { at: 0, path: [[0, 880], [0.07, 1397]], decay: 0.28, gain: 0.9 },
      { at: 0.16, path: [[0, 880], [0.07, 1397]], decay: 0.28, gain: 0.9 },
      { at: 0.32, path: [[0, 1865]], decay: 0.95, gain: 0.8 },
    ],
    taps: [0, 160, 320],
  },
};
export const DEFAULT_SOUND = 'onda';
const soundOf = (key) => SOUNDS[key] || SOUNDS[DEFAULT_SOUND];
const RATE = 44100;
const LENGTH = 1.5; // segundos — curto o bastante para o Android tratar como aviso
const VOLUME = 0.35; // volume do aviso (1 = máximo sem distorcer)

/** Ritmo da vibração, no formato do navigator.vibrate: [liga, desliga, liga, …] em ms. */
export const rhythmOf = ({ taps }) =>
  taps.flatMap((at, i) => {
    const on = i === taps.length - 1 ? 220 : 40;
    return i < taps.length - 1 ? [on, taps[i + 1] - at - on] : [on];
  });

/** Altura da voz no instante `dt`: desliza suave (em escala musical) entre os pontos do caminho. */
function pitchAt(path, dt) {
  if (dt <= path[0][0]) return path[0][1];
  for (let i = 1; i < path.length; i++) {
    const [t1, f1] = path[i];
    if (dt < t1) {
      const [t0, f0] = path[i - 1];
      const u = (dt - t0) / (t1 - t0);
      const smooth = u * u * (3 - 2 * u);
      return f0 * Math.pow(f1 / f0, smooth);
    }
  }
  return path.at(-1)[1];
}

/** As amostras do aviso, de -1 a 1. */
export function chimeSamples(sound = soundOf()) {
  const out = new Float32Array(Math.round(RATE * LENGTH));
  for (const { at, path, decay, gain } of sound.voices) {
    let phase = 0;
    for (let i = Math.round(at * RATE); i < out.length; i++) {
      const dt = i / RATE - at;
      // entra em 12 ms sem estalo e some aos poucos
      const attack = dt < 0.012 ? Math.sin((Math.PI / 2) * (dt / 0.012)) ** 2 : 1;
      const env = attack * Math.exp((-4.6 * dt) / decay) * gain;
      if (dt > 0.05 && env < 1e-4) break;
      phase += (2 * Math.PI * pitchAt(path, dt)) / RATE;
      out[i] += (Math.sin(phase) + 0.12 * Math.sin(2 * phase) + 0.04 * Math.sin(3 * phase)) * env;
    }
  }
  // normaliza o pico, sem saturar: o som fica limpo
  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  for (let i = 0; i < out.length; i++) {
    // some suave nos últimos 30 ms do arquivo
    const tail = Math.min(1, (out.length - i) / (RATE * 0.03));
    out[i] = (out[i] / peak) * 0.9 * VOLUME * tail;
  }
  return out;
}

/** WAV mono de 16 bits com as amostras. */
export function wavBytes(samples) {
  const v = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o, txt) => [...txt].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.round(s * 32767), true));
  return v.buffer;
}

const wavUrl = (samples) => URL.createObjectURL(new Blob([wavBytes(samples)], { type: 'audio/wav' }));

// O navegador só libera áudio dentro de um toque do usuário. O iPhone só conta o fim do toque
// (touchend/click), não o pointerdown — por isso isto roda a cada toque até dar certo.
// Cada som tem seu <audio> (para o Android abaixar a música) e seu buffer de Web Audio (reserva).
let audioCtx, primed = false, priming = false;
const chimes = {}, buffers = {};

export function unlockAudio() {
  if (audioCtx === undefined) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = Ctx ? new Ctx() : null;
    for (const key of Object.keys(SOUNDS)) {
      const samples = chimeSamples(SOUNDS[key]);
      if (audioCtx) {
        buffers[key] = audioCtx.createBuffer(1, samples.length, RATE);
        buffers[key].getChannelData(0).set(samples);
      }
      try {
        chimes[key] = new Audio(wavUrl(samples));
        chimes[key].preload = 'auto';
      } catch {}
    }
  }
  if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
  // tocar cada som uma vez, mudo, dentro do toque: depois o iPhone deixa tocar sem toque
  const list = Object.values(chimes);
  if (primed || priming || !list.length) return;
  if (isIOS) setAudioSession('transient');
  priming = true;
  Promise.all(
    list.map((a) => {
      a.muted = true;
      return a.play().then(() => {
        // se o aviso começou a tocar nesse meio-tempo, não interrompe
        if (a.muted) { a.pause(); a.currentTime = 0; }
        a.muted = false;
      });
    })
  ).then(
    () => { primed = true; priming = false; },
    () => { list.forEach((a) => { a.muted = false; }); priming = false; }
  );
}

/** Liga o desbloqueio do áudio aos toques. Devolve a função que desliga. */
export function listenForUnlock() {
  const events = ['touchend', 'click', 'keydown'];
  events.forEach((ev) => addEventListener(ev, unlockAudio, { capture: true, passive: true }));
  return () => events.forEach((ev) => removeEventListener(ev, unlockAudio, { capture: true }));
}

/** Tipo da sessão de áudio no Safari 17+. "transient" mistura com a música sem pausá-la. */
function setAudioSession(type) {
  try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch {}
}

/** Toca pelo Web Audio: só se mistura com a música. */
function playBuffer(key) {
  const buffer = buffers[key] || buffers[DEFAULT_SOUND];
  if (!audioCtx || !buffer) return;
  audioCtx.resume?.();
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}

/**
 * Toca o aviso `key`. Com `duck` (Android), usa <audio> para pedir que a música abaixe.
 * No iPhone usa sempre <audio> com a sessão "transient": é o jeito que não pausa o Spotify.
 */
export function beep({ key = DEFAULT_SOUND, duck = false } = {}) {
  const chime = chimes[key] || chimes[DEFAULT_SOUND];
  if (!(duck || isIOS) || !chime) return playBuffer(key);
  if (isIOS) setAudioSession('transient');
  // para qualquer outro aviso que ainda esteja tocando
  Object.values(chimes).forEach((a) => { if (a !== chime && !a.paused) a.pause(); });
  chime.muted = false;
  chime.currentTime = 0;
  chime.play().catch(() => playBuffer(key));
}

/* ---------- vibração ---------- */

// O iPhone não tem navigator.vibrate. No iOS 18, marcar um <input switch> dá um toque leve no motor
// de vibração; vários toques seguidos imitam o ritmo. Pode não funcionar sem um toque na tela.
function iosTap() {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.body.append(label);
  label.click();
  label.remove();
}

function iosVibrate(pattern) {
  const list = typeof pattern === 'number' ? [pattern] : pattern;
  let t = 0;
  list.forEach((ms, i) => {
    // trechos "liga": um toque no começo e mais um a cada ~100 ms, se for longo
    if (i % 2 === 0) for (let k = 0; k < Math.max(1, Math.round(ms / 100)); k++) setTimeout(iosTap, t + k * 100);
    t += ms;
  });
}

export const vibrate = (pattern) => {
  if (navigator.vibrate) return navigator.vibrate(pattern);
  if (isIOS) iosVibrate(pattern);
};

/** Fim do descanso: som e vibração juntos, no mesmo ritmo. */
export function restAlert(settings) {
  if (settings.vibrate) vibrate(rhythmOf(soundOf(settings.chime)));
  if (settings.sound) beep({ key: settings.chime, duck: settings.duck });
}

/* ---------- notificação ---------- */

export function notify(title, body) {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  navigator.serviceWorker?.ready.then((reg) =>
    reg.showNotification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'rest',
      renotify: true,
      vibrate: rhythmOf(soundOf()),
    })
  );
}
