// توليد الأسئلة. كل شيء حتمي من البذرة (seed) ليحصل اللاعبان في المبارزة على نفس الأسئلة بنفس الترتيب.
import { WORDS, BY_ID } from './words.js';
import { BASIC } from './data/basic.js';
import { verbForms, pastRegular } from './forms.js';
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const TYPES = {
  mean: 'ما معنى هذه الكلمة؟',
  rev: 'ما الكلمة الإنجليزية لهذا المعنى؟',
  listen: 'استمع ثم اختر الكلمة',
  cloze: 'أكمل الجملة بالكلمة المناسبة',
  def: 'أي كلمة يصفها هذا التعريف؟',
  spell: 'استمع واكتب الكلمة',
  form: 'اختر الصيغة الصحيحة للفعل'
};
export const MC_TYPES = ['mean', 'rev', 'listen', 'cloze', 'def'];

function distractors(w, r, n = 3, key = 'ar', easy = false) {
  const same = easy ? WORDS.filter(x => x.id !== w.id && x[key] !== w[key] && x.lvl <= Math.max(1, w.lvl)) : WORDS.filter(x => x.id !== w.id && x.pos === w.pos && x[key] !== w[key] && Math.abs(x.lvl - w.lvl) <= 1);
  const rest = WORDS.filter(x => x.id !== w.id && x.pos !== w.pos && x[key] !== w[key]);
  const pick = [], seen = new Set([w[key]]);
  for (const x of [...shuffle(same, r), ...shuffle(rest, r)]) { if (seen.has(x[key])) continue; seen.add(x[key]); pick.push(x); if (pick.length >= n) break; }
  return pick;
}

const KINDS = [['past', 'الماضي البسيط (Past Simple)'], ['pp', 'اسم المفعول (Past Participle)'], ['ing', 'الفعل + ing'], ['third', 'المفرد الغائب (he/she/it)']];
export function makeFormQ(id, r) {
  const w = BY_ID[id] || BASIC[id]; const f = verbForms(id); const [k, label] = KINDS[Math.floor(r() * KINDS.length)];
  const right = f[k]; const naive = id + 'ed', alt = pastRegular(id);
  const pool = [...new Set([f.base, f.third, f.past, f.pp, f.ing, naive, alt, id + 's', id + 'ing'])].filter(x => x !== right && !right.split('/').includes(x));
  const opts = shuffle([right, ...shuffle(pool, r).slice(0, 3)], r);
  return { id, type: 'form', w: { id, en: id, ar: w ? w.ar : '', pos: 'v', ex: '', def: '' }, label, prompt: id, opts, ans: opts.indexOf(right), formKind: k };
}
export function makeQ(id, type, r, easy = false) {
  if (type === 'form') return makeFormQ(id, r);
  const w = BY_ID[id];
  if (type === 'cloze' && !/\{[^}]+\}/.test(w.ex || '')) type = 'rev';
  if (type === 'def' && !w.def) type = 'rev';
  const q = { id, type, w };
  if (type === 'spell') { q.answer = w.en; return q; }
  const key = type === 'mean' ? 'ar' : 'en';
  const opts = shuffle([w, ...distractors(w, r, 3, key, easy)], r);
  q.opts = opts.map(o => o[key]); q.ans = opts.findIndex(o => o.id === w.id);
  if (type === 'cloze') q.sentence = w.ex.replace(/\{[^}]+\}/, '_____');
  return q;
}

// أسئلة المبارزة: تبدأ سهلة جدًا (كلمة إنجليزية ← معناها) وتتدرّج. حتمية من البذرة.
export const duelSecs = i => i < 10 ? 20 : i < 20 ? 16 : 14;
export function duelQuestions(seed, n) {
  const r = rng(seed); const pools = [shuffle(WORDS.filter(w => w.lvl === 1), r), shuffle(WORDS.filter(w => w.lvl <= 2), r), shuffle(WORDS.filter(w => w.lvl >= 2 && w.lvl <= 3), r)];
  const used = new Set(); const out = [];
  for (let i = 0; i < n; i++) {
    const st = i < 10 ? 0 : i < 20 ? 1 : 2; let w; do { w = pools[st].shift(); } while (w && used.has(w.id)); if (!w) { w = WORDS[Math.floor(r() * WORDS.length)]; }
    used.add(w.id);
    const type = st === 0 ? 'mean' : st === 1 ? ['mean', 'rev', 'listen'][Math.floor(r() * 3)] : ['mean', 'rev', 'listen', 'cloze'][Math.floor(r() * 4)];
    out.push(makeQ(w.id, type, r, st === 0));
  }
  return out;
}
export const duelPoints = (ok, ms, secs = 20) => ok ? 10 + Math.round(5 * Math.max(0, 1 - ms / (secs * 1000))) : 0;

// أنواع الأسئلة المناسبة لمرحلة الكلمة (الأقل إتقانًا → أسهل)
export function typeFor(card, r = Math.random) {
  const b = card ? card.b : 0;
  const pool = b <= 1 ? ['mean', 'listen', 'mean', 'def'] : b <= 3 ? ['rev', 'cloze', 'listen', 'def'] : ['rev', 'cloze', 'spell', 'def'];
  return pool[Math.floor(r() * pool.length)];
}
export const norm = s => s.trim().toLowerCase().replace(/[^a-z]/g, '');
