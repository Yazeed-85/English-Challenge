import { WORDS, LEVELS, TOPICS } from '../words.js';
import { state } from '../store.js';
import { statusOf, STATUS_AR } from '../srs.js';
import { h, icon } from '../ui.js';
import { openWord } from './wordsheet.js';

export function mount() {
  const el = h('section', { class: 'view words' }); const S = state();
  let q = '', f = 'all', lv = 0, shown = 80;
  const inp = h('input', { class: 'inp', placeholder: 'ابحث بالإنجليزية أو العربية…', oninput: e => { q = e.target.value.trim().toLowerCase(); shown = 80; draw(); } });
  const F = [['all', 'الكل'], ['new', 'جديدة'], ['learning', 'قيد التعلّم'], ['known', 'مألوفة'], ['mastered', 'متقنة'], ['hard', 'صعبة'], ['star', '⭐ مفضّلة'], ['note', '📝 ملاحظاتي']];
  const chips = h('div', { class: 'chips scroll' }, F.map(([k, t]) => h('button', { class: 'chip' + (k === f ? ' on' : ''), onclick: e => { f = k; [...chips.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); shown = 80; draw(); } }, t)));
  const lvs = h('div', { class: 'chips scroll' }, [[0, 'كل المستويات'], ...[1, 2, 3, 4].map(n => [n, LEVELS[n].name])].map(([k, t]) => h('button', { class: 'chip sm' + (k === lv ? ' on' : ''), onclick: e => { lv = k; [...lvs.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); shown = 80; draw(); } }, t)));
  const list = h('div', { class: 'wlist' }); const count = h('small', { class: 'muted' });
  const pass = w => { const c = S.cards[w.id]; const st = statusOf(c);
    if (lv && w.lvl !== lv) return false;
    if (q && !(w.en.toLowerCase().includes(q) || w.ar.includes(q))) return false;
    if (f === 'new' || f === 'learning' || f === 'known' || f === 'mastered') return st === f;
    if (f === 'hard') return c && c.w > 0 && c.b <= 3;
    if (f === 'star') return !!S.stars[w.id];
    if (f === 'note') return !!S.notes[w.id];
    return true; };
  function draw() {
    const all = WORDS.filter(pass); list.innerHTML = ''; count.textContent = `${all.length} كلمة`;
    all.slice(0, shown).forEach(w => { const st = statusOf(S.cards[w.id]); list.append(h('button', { class: 'wrow', onclick: () => openWord(w.id) }, h('i', { class: 'sdot st-' + st, title: STATUS_AR[st] }), h('b', { dir: 'ltr' }, w.en), h('span', { class: 'muted' }, w.ar), S.notes[w.id] ? h('span', {}, '📝') : null, S.stars[w.id] ? h('span', {}, '⭐') : null)); });
    if (all.length > shown) list.append(h('button', { class: 'btn ghost wide', onclick: () => { shown += 80; draw(); } }, 'عرض المزيد'));
    if (!all.length) list.append(h('p', { class: 'muted center' }, 'لا نتائج'));
  }
  el.append(h('h1', { class: 'ttl' }, 'قاموسي'), h('div', { class: 'searchbox' }, icon('search', 20), inp), chips, lvs, count, list); draw();
  return { el };
}
