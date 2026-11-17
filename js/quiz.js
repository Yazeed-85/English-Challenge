// توليد الأسئلة. كل شيء حتمي من البذرة (seed) ليحصل اللاعبان في المبارزة على نفس الأسئلة بنفس الترتيب.
import { WORDS, BY_ID } from './words.js';
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const TYPES = {
  mean: 'ما معنى هذه الكلمة؟',
  rev: 'ما الكلمة الإنجليزية لهذا المعنى؟',
  listen: 'استمع ثم اختر الكلمة',
  cloze: 'أكمل الجملة بالكلمة المناسبة',
  def: 'أي كلمة يصفها هذا التعريف؟',
  spell: 'استمع واكتب الكلمة'
};
export const MC_TYPES = ['mean', 'rev', 'listen', 'cloze', 'def'];

function distractors(w, r, n = 3, key = 'ar') {
  const same = WORDS.filter(x => x.id !== w.id && x.pos === w.pos && x[key] !== w[key] && Math.abs(x.lvl - w.lvl) <= 1);
  const rest = WORDS.filter(x => x.id !== w.id && x.pos !== w.pos && x[key] !== w[key]);
  const pick = [], seen = new Set([w[key]]);
  for (const x of [...shuffle(same, r), ...shuffle(rest, r)]) { if (seen.has(x[key])) continue; seen.add(x[key]); pick.push(x); if (pick.length >= n) break; }
  return pick;
}

export function makeQ(id, type, r) {
  const w = BY_ID[id]; const q = { id, type, w };
  if (type === 'spell') { q.answer = w.en; return q; }
  const key = type === 'mean' ? 'ar' : 'en';
  const opts = shuffle([w, ...distractors(w, r, 3, key)], r);
  q.opts = opts.map(o => o[key]); q.ans = opts.findIndex(o => o.id === w.id);
  if (type === 'cloze') q.sentence = w.ex.replace(/\{[^}]+\}/, '_____');
  return q;
}

// قائمة أسئلة المبارزة من البذرة
export function duelQuestions(seed, n, lv) {
  const r = rng(seed); const pool = WORDS.filter(w => !lv || w.lvl === lv || (lv === 4 && w.lvl >= 3));
  const ids = shuffle(pool.map(w => w.id), r).slice(0, n);
  return ids.map(id => makeQ(id, MC_TYPES[Math.floor(r() * MC_TYPES.length)], r));
}
export const duelPoints = (ok, ms, secs) => ok ? 10 + Math.round(5 * Math.max(0, 1 - ms / (secs * 1000))) : 0;

// أنواع الأسئلة المناسبة لمرحلة الكلمة (الأقل إتقانًا → أسهل)
export function typeFor(card, r = Math.random) {
  const b = card ? card.b : 0;
  const pool = b <= 1 ? ['mean', 'listen', 'mean', 'def'] : b <= 3 ? ['rev', 'cloze', 'listen', 'def'] : ['rev', 'cloze', 'spell', 'def'];
  return pool[Math.floor(r() * pool.length)];
}
export const norm = s => s.trim().toLowerCase().replace(/[^a-z]/g, '');
