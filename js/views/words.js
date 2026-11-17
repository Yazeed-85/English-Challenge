// «دفتري»: كلماتي المعلَّمة (أصفر = أتعلّمها، أخضر = تعلّمتها) + القاموس العام مع بحث عربي/إنجليزي ذكي.
import { WORDS, BY_ID, POS_AR } from '../words.js';
import { BASIC } from '../data/basic.js';
import { state } from '../store.js';
import { statusOf, STATUS_AR, flagIds } from '../srs.js';
import { searchDict } from '../lookup.js';
import { h, icon, stagger } from '../ui.js';
import { openWord, openForms } from './wordsheet.js';
import { speak } from '../speech.js';
import { flagOf, refreshBookBadge } from '../flag.js';
import { LEVELS } from '../words.js';

export function mount({ app }) {
  const el = h('section', { class: 'view words' }); const S = state();
  let tab = S.settings.bookTab || 'mine'; const body = h('div', { class: 'wbody' });
  const seg = h('div', { class: 'seg big' }, [['mine', '📒 كلماتي'], ['dict', '📚 القاموس العام']].map(([k, t]) => h('button', { class: k === tab ? 'on' : '', onclick: e => { tab = k; S.settings.bookTab = k; [...seg.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); draw(); } }, t)));
  el.append(h('h1', { class: 'ttl' }, 'دفتري'), seg, body);

  function item(id, fresh) {
    const w = BY_ID[id], f = flagOf(id), c = S.cards[id]; const learned = f.s === 'd';
    return h('div', { class: 'bitem ' + (learned ? 'done' : 'learn') + (fresh ? ' fresh' : ''), onclick: () => openWord(id) },
      h('i', { class: 'bar' }),
      h('div', { class: 'grow' }, h('div', { class: 'bw' }, h('b', { dir: 'ltr', class: learned ? '' : 'fl' }, w.en), h('span', { class: 'ar' }, w.ar)),
        f.ctx ? h('small', { class: 'ctx', dir: 'ltr' }, f.ctx.length > 70 ? f.ctx.slice(0, 68) + '…' : f.ctx) : null,
        learned ? h('small', { class: 'okline' }, `✅ تعلّمت هذه الكلمة${f.dt ? ' · ' + new Date(f.dt).toLocaleDateString('ar') : ''}`) : h('div', { class: 'boxes' }, [0, 1, 2].map(i => h('i', { class: c && c.b >= i + 1 ? 'on' : '' })))),
      h('div', { class: 'col gap' }, h('button', { class: 'icon-btn sm', onclick: e => { e.stopPropagation(); speak(w.en); } }, icon('volume', 18)), w.pos ? h('button', { class: 'icon-btn sm', title: 'التصاريف', onclick: e => { e.stopPropagation(); openForms(id); } }, icon('clock', 18)) : null));
  }

  function drawMine() {
    const lr = flagIds('l').sort((a, b) => S.flags[b].t - S.flags[a].t), dn = flagIds('d').sort((a, b) => (S.flags[b].dt || 0) - (S.flags[a].dt || 0));
    const wrap = h('div', { class: 'mine' });
    wrap.append(h('div', { class: 'grid2 sums' }, h('div', { class: 'sum learn' }, h('b', {}, lr.length), h('small', {}, '🟡 أتعلّمها')), h('div', { class: 'sum done' }, h('b', {}, dn.length), h('small', {}, '✅ تعلّمتها'))));
    if (lr.length) wrap.append(h('button', { class: 'btn primary wide', onclick: () => app.goto('session/mywords') }, icon('target', 18), ` تدرّب على كلماتي (${lr.length})`));
    if (!lr.length && !dn.length) wrap.append(h('div', { class: 'empty-card' }, h('div', { class: 'big' }, '📒'), h('h3', {}, 'دفترك فارغ حتى الآن'), h('p', { class: 'muted' }, 'اقرأ فقرة واضغط أي كلمة لا تعرفها لتضيفها هنا بالأصفر. وعندما تجيب عنها صحيحًا في الاختبارات تتحوّل إلى الأخضر وتبقى هنا كإنجاز.'), h('button', { class: 'btn primary', onclick: () => app.goto('read') }, 'ابدأ بقراءة فقرة')));
    if (lr.length) { wrap.append(h('div', { class: 'sec-h' }, h('b', {}, '🟡 أتعلّمها'), h('small', { class: 'muted' }, 'تتحوّل للأخضر عند إتقانها')), h('div', { class: 'blist' }, lr.map((id, i) => item(id, Date.now() - S.flags[id].t < 6000)))); }
    if (dn.length) wrap.append(h('div', { class: 'sec-h' }, h('b', {}, '✅ تعلّمتها'), h('small', { class: 'muted' }, 'أحسنت! تبقى هنا للتذكّر')), h('div', { class: 'blist' }, dn.map(id => item(id))));
    return wrap;
  }

  let q = '', f = 'all', lv = 0, shown = 80;
  function drawDict() {
    const wrap = h('div', { class: 'dict' });
    const inp = h('input', { class: 'inp', placeholder: 'ابحث: accept أو قبول أو accepted…', value: q }); inp.addEventListener('input', e => { q = e.target.value; shown = 80; list(); });
    const F = [['all', 'الكل'], ['new', 'جديدة'], ['learning', 'قيد التعلّم'], ['known', 'مألوفة'], ['mastered', 'متقنة'], ['hard', 'صعبة'], ['star', '⭐ مفضّلة'], ['note', '📝 ملاحظاتي']];
    const chips = h('div', { class: 'chips scroll' }, F.map(([k, t]) => h('button', { class: 'chip' + (k === f ? ' on' : ''), onclick: e => { f = k; [...chips.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); shown = 80; list(); } }, t)));
    const lvs = h('div', { class: 'chips scroll' }, [[0, 'كل المستويات'], ...[1, 2, 3, 4].map(n => [n, LEVELS[n].name])].map(([k, t]) => h('button', { class: 'chip sm' + (k === lv ? ' on' : ''), onclick: e => { lv = k; [...lvs.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); shown = 80; list(); } }, t)));
    const count = h('small', { class: 'muted' }), out = h('div', { class: 'wlist' });
    const pass = w => { const c = S.cards[w.id]; const st = statusOf(c);
      if (lv && w.lvl !== lv) return false;
      if (['new', 'learning', 'known', 'mastered'].includes(f)) return st === f;
      if (f === 'hard') return c && c.w > 0 && c.b <= 3; if (f === 'star') return !!S.stars[w.id]; if (f === 'note') return !!S.notes[w.id]; return true; };
    function list() {
      const all = searchDict(q).filter(pass); out.innerHTML = ''; count.textContent = `${all.length} كلمة`;
      all.slice(0, shown).forEach(w => { const st = statusOf(S.cards[w.id]); const fl = flagOf(w.id); out.append(h('button', { class: 'wrow' + (fl && fl.s === 'l' ? ' flagged' : ''), onclick: () => openWord(w.id) }, h('i', { class: 'sdot st-' + st, title: STATUS_AR[st] }), h('b', { dir: 'ltr', class: fl && fl.s === 'l' ? 'fl' : '' }, w.en), h('span', { class: 'muted' }, w.ar), fl && fl.s === 'd' ? h('span', {}, '✅') : null, S.notes[w.id] ? h('span', {}, '📝') : null, S.stars[w.id] ? h('span', {}, '⭐') : null)); });
      if (all.length > shown) out.append(h('button', { class: 'btn ghost wide', onclick: () => { shown += 80; list(); } }, 'عرض المزيد'));
      if (q.trim()) { const l = q.trim().toLowerCase(); const ar = /[؀-ۿ]/.test(q); const extra = Object.values(BASIC).filter(b => b.pos !== 'name' && (ar ? b.ar.includes(q.trim()) : b.en.toLowerCase() === l)).slice(0, 6); if (extra.length) { out.append(h('div', { class: 'sec-h xtra' }, h('b', {}, 'مفردات أساسية'))); extra.forEach(b => out.append(h('div', { class: 'wrow basic' }, h('b', { dir: 'ltr' }, b.en), h('span', { class: 'muted' }, b.ar), h('small', {}, POS_AR[b.pos] || b.pos)))); } }
      if (!all.length && !q.trim()) out.append(h('p', { class: 'muted center' }, 'لا نتائج'));
      if (!all.length && q.trim()) out.append(h('p', { class: 'muted center' }, 'لا توجد كلمة مطابقة في القاموس العام. جرّب كلمة أخرى، أو اضغط الكلمة داخل فقرة لإضافتها.'));
    }
    wrap.append(h('div', { class: 'searchbox' }, icon('search', 20), inp), chips, lvs, count, out); list(); return wrap;
  }
  function draw() { body.innerHTML = ''; const n = tab === 'mine' ? drawMine() : drawDict(); body.append(n); stagger(n.children, { stagger: .04 }); }
  draw(); refreshBookBadge();
  const again = () => { if (el.isConnected && tab === 'mine') draw(); }; window.addEventListener('flags:changed', again);
  return { el, destroy() { window.removeEventListener('flags:changed', again); } };
}
