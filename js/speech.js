import { state } from './store.js';
let voice = null;
function pick() { const v = speechSynthesis.getVoices(); voice = v.find(x => /en[-_]US/i.test(x.lang) && /(google|samantha|natural|aria|jenny)/i.test(x.name)) || v.find(x => /en[-_]US/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null; }
if ('speechSynthesis' in window) { pick(); speechSynthesis.onvoiceschanged = pick; }
export const canSpeak = 'speechSynthesis' in window;
export function speak(text, slow = false) {
  if (!canSpeak) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[{}]/g, ''));
    u.lang = 'en-US'; u.rate = slow ? 0.6 : state().settings.rate; if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  } catch (e) {}
}
