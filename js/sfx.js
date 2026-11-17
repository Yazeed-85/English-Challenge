import { state } from './store.js';
let ctx = null;
function tone(f, t0, dur, type = 'sine', vol = 0.12) {
  if (!state().settings.sound) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
    o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05);
  } catch (e) {}
}
export const sfx = {
  ok() { tone(660, 0, 0.12); tone(880, 0.09, 0.18); },
  bad() { tone(220, 0, 0.22, 'triangle', 0.14); tone(165, 0.12, 0.25, 'triangle', 0.14); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.25)); },
  tick() { tone(900, 0, 0.05, 'square', 0.04); },
  pop() { tone(500, 0, 0.06, 'sine', 0.08); }
};
export const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
