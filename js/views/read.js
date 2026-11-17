// قراءة فردية: فقرة مناسبة لمستواك، استماع وترجمة وتعليم كلمات، ثم «أنهيت القراءة».
import { PASSAGES, PASSAGE_BY_ID } from '../data/passages.js';
import { state, save, bumpDay, saveNow } from '../store.js';
import { reader } from '../reader.js';
import { h, icon, sheet, toast, confetti, countUp } from '../ui.js';
import { XP } from '../config.js';
import { sfx } from '../sfx.js';

export const nextPassage = () => { const S = state(); const lv = S.settings.level; const un = PASSAGES.filter(p => !S.read[p.id]); return un.find(p => p.lv >= lv) || un[0] || PASSAGES[Math.floor(Math.random() * PASSAGES.length)]; };

export function mount({ args, app }) {
  const S = state(); const el = h('section', { class: 'view read' });
  const p = PASSAGE_BY_ID[args[0]] || nextPassage(); let rd = null;
  const done = S.read[p.id];
  const body = h('div', { class: 'card' });
  const top = h('div', { class: 'row between' }, h('button', { class: 'icon-btn', onclick: () => app.goto('practice') }, icon('back', 22, 'flip')), h('div', { class: 'tag' }, `فقرة ${PASSAGES.indexOf(p) + 1} / ${PASSAGES.length} · المستوى ${p.lv}`), h('button', { class: 'btn ghost sm', onclick: pick }, 'فقرة أخرى'));
  rd = reader(p); body.append(rd);
  const finish = h('button', { class: 'btn primary wide', onclick: () => {
    if (!state().read[p.id]) { state().read[p.id] = Date.now(); bumpDay(0, 0, 15); saveNow(); sfx.win(); confetti(60); toast('+15 خبرة 🎉', 'good'); } else toast('قرأتها من قبل ✅');
    finish.replaceWith(h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: () => app.goto('read/' + nextPassage().id, false) }, 'فقرة تالية'), h('button', { class: 'btn ghost grow', onclick: () => app.goto('words') }, 'دفتري 📒')));
  } }, done ? 'قرأتها ✅ — اقرأها مجددًا' : 'أنهيت القراءة');
  el.append(top, body, finish);
  function pick() {
    const list = h('div', { class: 'plist' }, PASSAGES.map((q, i) => h('button', { class: 'pitem', onclick: () => { s.close(); app.goto('read/' + q.id); } }, h('span', { class: 'pn' }, i + 1), h('div', { class: 'grow' }, h('b', { dir: 'ltr' }, q.title), h('small', {}, `${q.titleAr} · مستوى ${q.lv}`)), S.read[q.id] ? h('span', { class: 'pill good' }, 'قُرئت') : null)));
    const s = sheet(list, { title: 'اختر فقرة' });
  }
  return { el, destroy() { rd && rd.destroy(); } };
}
