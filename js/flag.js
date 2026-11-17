// تعليم الكلمات: أصفر = أتعلّمها، أخضر (في الدفتر) = تعلّمتها. تنتقل الكلمة للدفتر بحركة طيران.
import { BY_ID } from './words.js';
import { state, save, dayNum } from './store.js';
import { addCustom } from './lookup.js';
import { toast, h } from './ui.js';
import { sfx } from './sfx.js';

export const flagOf = id => state().flags[id] || null;
export const isLearning = id => { const f = flagOf(id); return !!f && f.s === 'l'; };
export const flagCount = () => Object.values(state().flags).filter(f => f.s === 'l').length;

export function flagWord({ id, en, ar, pos, sentence, token }, fromEl) {
  const S = state();
  const ex = sentence && token && token.toLowerCase() === id ? sentence.replace(new RegExp('\\b' + token + '\\b', 'i'), m => `{${m}}`) : '';
  if (BY_ID[id] && !BY_ID[id].custom) S.flags[id] = { s: 'l', t: Date.now(), ctx: sentence || '' };
  else addCustom(id, { en: en || id, ar: ar || '؟', pos: pos || '', ex, ctx: sentence || '' });
  if (!S.cards[id]) S.cards[id] = { b: 0, d: dayNum(), s: 0, w: 0 };
  save(); sfx.pop();
  if (fromEl) flyToBook(fromEl, en || id);
  paintFlags();
  window.dispatchEvent(new Event('flags:changed'));
}
export function unflag(id) { const S = state(); delete S.flags[id]; save(); paintFlags(); window.dispatchEvent(new Event('flags:changed')); }

// تلوين كل ظهور للكلمة المعلَّمة داخل الصفحة
export function paintFlags(root = document) {
  const S = state();
  root.querySelectorAll('.w[data-l]').forEach(el => el.classList.toggle('fl', !!S.flags[el.dataset.l] && S.flags[el.dataset.l].s === 'l'));
}

// حركة: نسخة من الكلمة تطير إلى أيقونة «دفتري»
export function flyToBook(fromEl, text) {
  const tgt = document.querySelector('#tabs a[data-t=words]'); if (!tgt || !window.gsap) return;
  const a = fromEl.getBoundingClientRect(), b = tgt.getBoundingClientRect();
  const chip = h('div', { class: 'fly' }, text); document.body.append(chip);
  gsap.set(chip, { x: a.left + a.width / 2, y: a.top + a.height / 2, xPercent: -50, yPercent: -50, scale: 1.1 });
  gsap.timeline({ onComplete: () => { chip.remove(); bump(tgt); } })
    .to(chip, { y: '-=40', scale: 1.35, duration: .18, ease: 'power2.out' })
    .to(chip, { x: b.left + b.width / 2, y: b.top + b.height / 2, scale: .25, opacity: .3, duration: .62, ease: 'power3.in' });
}
export function bump(el) {
  gsap.fromTo(el, { scale: 1 }, { scale: 1.25, duration: .18, yoyo: true, repeat: 1, ease: 'power2.out' });
  let b = el.querySelector('.cnt'); if (!b) { b = h('b', { class: 'cnt' }); el.append(b); }
  const n = flagCount(); b.textContent = n; b.hidden = !n; gsap.fromTo(b, { scale: 1.8 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
}
export function refreshBookBadge() { const tgt = document.querySelector('#tabs a[data-t=words]'); if (!tgt) return; let b = tgt.querySelector('.cnt'); if (!b) { b = h('b', { class: 'cnt' }); tgt.append(b); } const n = flagCount(); b.textContent = n; b.hidden = !n; }
