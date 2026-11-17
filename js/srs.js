// التكرار المتباعد (نظام لايتنر): الصندوق 0..5 والفواصل بالأيام.
import { WORDS, BY_ID } from './words.js';
import { state, dayNum, save } from './store.js';
export const INTERVALS = [0, 1, 3, 7, 14, 30];
export const statusOf = c => !c ? 'new' : c.b >= 4 ? 'mastered' : c.b >= 3 ? 'known' : 'learning';
export const STATUS_AR = { new: 'جديدة', learning: 'قيد التعلّم', known: 'مألوفة', mastered: 'متقنة' };

export function record(id, correct) {
  const S = state(); const c = S.cards[id] || (S.cards[id] = { b: 0, d: dayNum(), s: 0, w: 0 });
  c.s++; if (!correct) c.w++;
  c.b = correct ? Math.min(5, c.b + 1) : Math.max(0, c.b - 2);
  c.d = dayNum() + INTERVALS[c.b]; c.l = dayNum();
  // كلمة معلَّمة (أصفر): تصبح «متعلَّمة» (أخضر) عندما تُجاب صحيحًا حتى الصندوق 2
  const f = S.flags[id]; if (f && f.s === 'l' && correct && c.b >= 2) { f.s = 'd'; f.dt = Date.now(); try { window.dispatchEvent(new CustomEvent('word:learned', { detail: id })); } catch (e) {} }
  save(); return c;
}
export const isDue = c => c && c.d <= dayNum();
export const dueIds = () => { const S = state(); return Object.keys(S.cards).filter(id => BY_ID[id] && isDue(S.cards[id])).sort((a, b) => S.cards[a].d - S.cards[b].d || S.cards[a].b - S.cards[b].b); };
export const flagIds = st => { const S = state(); return Object.keys(S.flags).filter(id => BY_ID[id] && (!st || S.flags[id].s === st)); };
export const hardIds = () => { const S = state(); return Object.keys(S.cards).filter(id => BY_ID[id] && S.cards[id].w > 0 && S.cards[id].b <= 3).sort((a, b) => (S.cards[b].w - S.cards[b].b) - (S.cards[a].w - S.cards[a].b)); };
export function newIds(level, n) {
  const S = state(); const out = [];
  for (let lv = level; lv <= 4 && out.length < n; lv++) for (const w of WORDS) if (w.lvl === lv && !S.cards[w.id]) { out.push(w.id); if (out.length >= n) break; }
  if (out.length < n) for (let lv = 1; lv < level && out.length < n; lv++) for (const w of WORDS) if (w.lvl === lv && !S.cards[w.id]) { out.push(w.id); if (out.length >= n) break; }
  return out;
}
export function counts() {
  const S = state(); const r = { new: 0, learning: 0, known: 0, mastered: 0 };
  for (const w of WORDS) r[statusOf(S.cards[w.id])]++;
  return r;
}
export function levelCounts() {
  const S = state(); const r = {};
  for (const w of WORDS) { const x = r[w.lvl] || (r[w.lvl] = { total: 0, seen: 0, mastered: 0 }); x.total++; const c = S.cards[w.id]; if (c) { x.seen++; if (c.b >= 4) x.mastered++; } }
  return r;
}
