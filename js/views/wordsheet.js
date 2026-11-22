// نافذة تفاصيل الكلمة: المعنى والتعريف والمثال والنطق والملاحظة والتعليم للدفتر والتصاريف.
import { tapSentence, sayRow, plain } from '../tap.js';
import { BY_ID, POS_AR, LEVELS, TOPICS } from '../words.js';
import { state, save } from '../store.js';
import { statusOf, STATUS_AR } from '../srs.js';
import { table } from '../forms.js';
import { h, icon, sheet, hl } from '../ui.js';
import { speak } from '../speech.js';
import { app } from '../app.js';
import { flagWord, unflag, flagOf } from '../flag.js';

export function formsView(en, pos) {
  const secs = table(en, pos); if (!secs.length) return h('p', { class: 'muted' }, 'لا تصاريف لهذا النوع من الكلمات.');
  return h('div', { class: 'forms', dir: 'ltr' }, secs.map(s => h('div', { class: 'fsec' }, h('div', { class: 'ftitle', dir: 'rtl' }, s.title), s.rows.map(([k, v]) => h('div', { class: 'frow' }, h('span', { class: 'fk', dir: 'rtl' }, k), h('b', { class: 'fv' }, v))))));
}
import { BASIC } from '../data/basic.js';
export const openForms = id => { const w = BY_ID[id] || BASIC[id]; if (!w) return; return sheet(h('div', {}, h('div', { class: 'big-word', dir: 'ltr' }, w.en), h('div', { class: 'muted' }, `${POS_AR[w.pos] || ''} · ${w.ar}`), formsView(w.en, w.pos)), { title: 'التصاريف والأزمنة' }); };

export function openWord(id) {
  const w = BY_ID[id]; if (!w) return null;
  const S = state(); const c = S.cards[id]; const st = statusOf(c); const f = flagOf(id);
  const star = h('button', { class: 'icon-btn' + (S.stars[id] ? ' on' : ''), 'aria-label': 'مفضّلة', onclick: () => { S.stars[id] = S.stars[id] ? 0 : 1; if (!S.stars[id]) delete S.stars[id]; star.classList.toggle('on', !!S.stars[id]); save(); } }, icon('star', 22));
  const note = h('textarea', { class: 'note', rows: 3, maxlength: 280, placeholder: 'اكتب ملاحظتك: حيلة لتتذكّرها، جملة من عندك…' }); note.value = S.notes[id] || '';
  let t; note.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const v = note.value.trim(); if (v) S.notes[id] = v; else delete S.notes[id]; save(); }, 500); });
  const dots = h('div', { class: 'boxes' }, [0, 1, 2, 3, 4, 5].map(i => h('i', { class: c && c.b >= i && (i > 0 || c) ? 'on' : '' })));
  const flagBtn = h('button', { class: 'btn ghost sm', onclick: e => { if (flagOf(id) && flagOf(id).s === 'l') { unflag(id); } else { flagWord({ id, en: w.en, ar: w.ar, pos: w.pos }, e.currentTarget); } s.close(); } },
    f && f.s === 'l' ? '🟡 أتعلّمها — إزالة' : f && f.s === 'd' ? '✅ تعلّمتها' : '🟡 أضفها إلى دفتري');
  const forms = h('div', { class: 'collapse', hidden: true }, formsView(w.en, w.pos));
  const body = h('div', { class: 'wsheet' },
    h('div', { class: 'wtop' },
      h('div', {}, h('div', { class: 'big-word' + (f && f.s === 'l' ? ' fl' : ''), dir: 'ltr' }, w.en), h('div', { class: 'muted' }, w.custom ? `${POS_AR[w.pos] || 'كلمتي'} · من دفتري` : `${POS_AR[w.pos] || w.pos} · ${LEVELS[w.lvl].name} (${LEVELS[w.lvl].cefr}) · ${TOPICS[w.topic]}`)),
      h('div', { class: 'row gap' }, star, h('button', { class: 'icon-btn say', 'aria-label': 'نطق', onclick: () => speak(w.en) }, icon('volume', 22)))),
    h('div', { class: 'ar-mean' }, w.ar),
    w.def ? h('p', { class: 'def', dir: 'ltr' }, w.def) : null,
    w.ex ? tapSentence(w.ex) : f && f.ctx ? tapSentence(f.ctx) : null,
    sayRow(w.en, w.ex || (f && f.ctx)),
    h('div', { class: 'progress-line' }, h('span', { class: 'pill st-' + st }, STATUS_AR[st]), dots, c ? h('span', { class: 'muted' }, `${c.s} محاولة · ${c.w} خطأ`) : h('span', { class: 'muted' }, 'لم تتدرّب عليها بعد')),
    f && f.s === 'd' ? h('div', { class: 'note-box good' }, `✅ تعلّمت هذه الكلمة${f.dt ? ' يوم ' + new Date(f.dt).toLocaleDateString('ar') : ''}. أحسنت!`) : null,
    h('div', { class: 'row gap wrap' }, flagBtn, w.pos ? h('button', { class: 'btn ghost sm', onclick: () => { forms.hidden = !forms.hidden; if (!forms.hidden) gsap.from(forms, { height: 0, opacity: 0, duration: .35, clearProps: 'all' }); } }, icon('clock', 18), ' التصاريف والأزمنة') : null),
    forms,
    h('label', { class: 'lbl' }, 'ملاحظتي'), note,
    h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: () => { s.close(); app.goto('session/word/' + id); } }, icon('target', 18), ' تدرّب عليها')));
  const s = sheet(body);
  return s;
}
