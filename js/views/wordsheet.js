// نافذة تفاصيل الكلمة: المعنى والتعريف والمثال والنطق والملاحظة والمفضّلة والتقدّم.
import { BY_ID, POS_AR, LEVELS, TOPICS } from '../words.js';
import { state, save } from '../store.js';
import { statusOf, STATUS_AR } from '../srs.js';
import { h, icon, sheet, hl, toast } from '../ui.js';
import { speak } from '../speech.js';
import { app } from '../app.js';

export function openWord(id) {
  const w = BY_ID[id]; if (!w) return null;
  const S = state(); const c = S.cards[id]; const st = statusOf(c);
  const star = h('button', { class: 'icon-btn' + (S.stars[id] ? ' on' : ''), 'aria-label': 'مفضّلة', onclick: () => { S.stars[id] = S.stars[id] ? 0 : 1; if (!S.stars[id]) delete S.stars[id]; star.classList.toggle('on', !!S.stars[id]); save(); } }, icon('star', 22));
  const note = h('textarea', { class: 'note', rows: 3, maxlength: 280, placeholder: 'اكتب ملاحظتك: حيلة لتتذكّرها، جملة من عندك…' }); note.value = S.notes[id] || '';
  let t; note.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const v = note.value.trim(); if (v) S.notes[id] = v; else delete S.notes[id]; save(); }, 500); });
  const dots = h('div', { class: 'boxes' }, [0, 1, 2, 3, 4, 5].map(i => h('i', { class: c && c.b >= i && (i > 0 || c) ? 'on' : '' })));
  const body = h('div', { class: 'wsheet' },
    h('div', { class: 'wtop' },
      h('div', {},
        h('div', { class: 'big-word', dir: 'ltr' }, w.en),
        h('div', { class: 'muted' }, `${POS_AR[w.pos] || w.pos} · ${LEVELS[w.lvl].name} (${LEVELS[w.lvl].cefr}) · ${TOPICS[w.topic]}`)),
      h('div', { class: 'row gap' }, star, h('button', { class: 'icon-btn say', 'aria-label': 'نطق', onclick: () => speak(w.en) }, icon('volume', 22)))),
    h('div', { class: 'ar-mean' }, w.ar),
    h('p', { class: 'def', dir: 'ltr' }, w.def),
    h('p', { class: 'ex', dir: 'ltr', html: hl(w.ex) }),
    h('button', { class: 'btn ghost sm', onclick: () => speak(w.ex.replace(/[{}]/g, ''), false) }, icon('volume', 18), ' اسمع الجملة'),
    h('div', { class: 'progress-line' }, h('span', { class: 'pill st-' + st }, STATUS_AR[st]), dots, c ? h('span', { class: 'muted' }, `${c.s} محاولة · ${c.w} خطأ`) : h('span', { class: 'muted' }, 'لم تتدرّب عليها بعد')),
    h('label', { class: 'lbl' }, 'ملاحظتي'), note,
    h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: () => { s.close(); app.goto('session/word/' + id); } }, icon('target', 18), ' تدرّب عليها')));
  const s = sheet(body);
  return s;
}
