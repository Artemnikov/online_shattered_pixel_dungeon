import { effectiveMusicVolume, subscribe } from '../menu/menuSettings';

// Single-instance music handler. At most one <audio> element is ever audible,
// regardless of which caller starts music — a new playMusic() stops (or fades
// out) whatever was playing before. Owns the crossfade so a React effect
// cleanup can never interrupt a fade mid-way (which previously killed it).

const FADE_MS = 200;
const FADE_STEPS = 20;

let current = null; // { el, id }
let fade = null;    // { timer, prev, steps, step }

function pause(el) {
  if (el) {
    el.pause();
    el.currentTime = 0;
  }
}

function applyVolumes() {
  const vol = effectiveMusicVolume();
  if (fade) {
    const t = fade.step / fade.steps;
    fade.prev.volume = Math.max(0, 1 - t) * vol;
    if (current) current.el.volume = Math.min(1, t) * vol;
  } else if (current) {
    current.el.volume = vol;
  }
}

function clearFade() {
  if (fade) {
    clearInterval(fade.timer);
    pause(fade.prev);
    fade = null;
  }
}

export function playMusic(id, url, { loop = false, crossfade = true } = {}) {
  clearFade();

  const prevEl = current?.el;
  if (prevEl && !crossfade) pause(prevEl);

  const el = new Audio(url);
  el.loop = loop;
  current = { el, id };
  applyVolumes();

  el.play().catch(() => {
    // Autoplay blocked (no user gesture yet) — retry once the user interacts.
    const retry = () => {
      if (current?.el === el) el.play().catch(() => {});
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
    };
    window.addEventListener('pointerdown', retry);
    window.addEventListener('keydown', retry);
  });

  if (prevEl && crossfade) {
    let step = 0;
    fade = { prev: prevEl, timer: null, steps: FADE_STEPS, step: 0 };
    fade.timer = setInterval(() => {
      fade.step = ++step;
      applyVolumes();
      if (step >= FADE_STEPS) clearFade();
    }, FADE_MS / FADE_STEPS);
  }

  return el;
}

export function stopMusic() {
  clearFade();
  pause(current?.el);
  current = null;
}

export function getCurrentMusicId() {
  return current?.id ?? null;
}

subscribe(applyVolumes);
