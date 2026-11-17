import { h, icon, stagger } from '../ui.js';
import { MODES, availability } from './session.js';
import { state } from '../store.js';
import { LEVELS } from '../words.js';

export function mount({ app }) {
  const el = h('section', { class: 'view practice' });
  const av = availability(); const S = state();
  const badge = { mywords: av.flag ? `${av.flag} كلمة` : '', review: av.due ? `${av.due} مستحقّة` : 'لا شيء مستحق', learn: av.fresh ? 'جديد' : 'اكتمل مستواك', mistakes: av.hard ? `${av.hard} كلمة` : 'لا أخطاء' };
  const lvSel = h('select', { class: 'inp sm', onchange: e => { S.settings.level = +e.target.value; } }, [1, 2, 3, 4].map(n => h('option', { value: n, selected: S.settings.level === n }, `${LEVELS[n].name} (${LEVELS[n].cefr})`)));
  el.append(h('h1', { class: 'ttl' }, 'تدرّب'), h('p', { class: 'muted' }, 'اختر طريقة التدرّب. كل إجابة تُحدّث جدول مراجعتك تلقائيًا.'),
    h('div', { class: 'row between lvrow' }, h('span', {}, 'مستوى الكلمات الجديدة'), lvSel),
    h('button', { class: 'mode sky c-read', onclick: () => app.goto('read') }, h('span', { class: 'ic' }, icon('note', 26)), h('div', { class: 'grow' }, h('b', {}, 'اقرأ فقرة'), h('small', {}, 'استمع، ترجم، وعلّم الكلمات التي لا تعرفها')), h('em', {}, '40 فقرة')),
    h('div', { class: 'modes' }, ['review', 'learn', 'mywords', 'quick', 'speed', 'listen', 'spell', 'cloze', 'forms', 'mistakes'].map(k => { const m = MODES[k]; return h('button', { class: 'mode ' + m.c, onclick: () => app.goto('session/' + k) }, h('span', { class: 'ic' }, icon(m.ic, 26)), h('div', { class: 'grow' }, h('b', {}, m.name), h('small', {}, m.desc)), badge[k] ? h('em', {}, badge[k]) : null); })),
    h('div', { class: 'card soon' }, h('b', {}, '🧩 قريبًا'), h('p', { class: 'muted' }, 'مطابقة الكلمات، ترتيب الجمل، لعبة التصاريف والأزمنة، ومزيد من الألعاب.')));
  stagger(el.querySelectorAll('.mode'), { delay: .1 });
  return { el };
}
