import { state, save, replaceAll, saveNow, levelInfo } from '../store.js';
import { cloud, me, restoreByCode, backupNow, pushPub } from '../identity.js';
import { AVATARS } from '../config.js';
import { LEVELS } from '../words.js';
import * as SRS from '../srs.js';
import { h, icon, avatar, toast, copyText, confirmBox, sheet, stagger } from '../ui.js';

export function mount({ app }) {
  const el = h('section', { class: 'view profile' }); const S = state(); const m = S.me;
  const spaced = m.pid.replace(/(.{4})/g, '$1 ').trim();
  const li = levelInfo(S.xp); const cs = SRS.counts(); const acc = S.totals.q ? Math.round(S.totals.ok / S.totals.q * 100) : 0;
  const nameInp = h('input', { class: 'inp', maxlength: 20, value: m.name }); nameInp.addEventListener('change', () => { const v = nameInp.value.trim(); if (v) { m.name = v; save(); pushPub(); toast('تم تحديث الاسم', 'good'); } });
  const grid = h('div', { class: 'av-grid' }, AVATARS.map(a => h('button', { class: 'av' + (a === m.av ? ' on' : ''), onclick: e => { m.av = a; save(); pushPub(); [...grid.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); head.replaceChildren(avatar(a, 64), h('div', {}, h('b', {}, m.name), h('small', { class: 'muted' }, `المستوى ${li.lv}`))); } }, a)));
  const head = h('div', { class: 'phead' }, avatar(m.av, 64), h('div', {}, h('b', {}, m.name), h('small', { class: 'muted' }, `المستوى ${li.lv}`)));
  const idBox = h('div', { class: 'idbox' }, h('small', {}, 'معرّفي (شاركه مع أصدقائك ليضيفوك)'), h('div', { class: 'row gap' }, h('code', { dir: 'ltr', class: 'pid' }, spaced), h('button', { class: 'icon-btn sm', 'aria-label': 'نسخ المعرّف', onclick: async () => toast((await copyText(m.pid)) ? 'تم نسخ المعرّف ✅' : 'تعذّر النسخ', 'good') }, icon('copy', 18))));
  const sel = (opts, cur, fn) => h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { class: v === cur ? 'on' : '', onclick: e => { fn(v); [...e.currentTarget.parentNode.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); save(); } }, t)));
  const code = m.key || '————';
  el.append(h('h1', { class: 'ttl' }, 'أنا'),
    h('div', { class: 'card' }, head, idBox, h('div', { class: 'stats4' }, [[S.xp, 'خبرة'], [cs.mastered + cs.known, 'كلمة مألوفة'], [S.streak.best, 'أفضل سلسلة'], [acc + '%', 'دقّة']].map(([v, t]) => h('div', {}, h('b', {}, v), h('small', {}, t))))),
    h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'الملف الشخصي')), h('label', { class: 'lbl' }, 'الاسم'), nameInp, h('label', { class: 'lbl' }, 'الصورة'), grid),
    h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'الإعدادات')),
      h('label', { class: 'lbl' }, 'الهدف اليومي (إجابات صحيحة)'), sel([[10, '10'], [20, '20'], [40, '40'], [60, '60']], S.settings.goal, v => S.settings.goal = v),
      h('label', { class: 'lbl' }, 'مستوى الكلمات الجديدة'), sel([1, 2, 3, 4].map(n => [n, LEVELS[n].name]), S.settings.level, v => S.settings.level = v),
      h('label', { class: 'lbl' }, 'الأصوات'), sel([[true, 'مفعّلة'], [false, 'صامتة']], S.settings.sound, v => S.settings.sound = v),
      h('label', { class: 'lbl' }, 'سرعة النطق'), sel([[0.7, 'بطيئة'], [0.85, 'عادية'], [1, 'سريعة']], S.settings.rate, v => S.settings.rate = v)),
    h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'النسخ الاحتياطي والاستعادة'), h('span', { class: 'pill ' + (cloud.ok ? 'good' : 'bad') }, cloud.ok ? 'متصل' : 'غير متصل')),
      h('p', { class: 'muted' }, 'تقدّمك محفوظ على هذا الجهاز وتُنسخ منه نسخة للسحابة تلقائيًا. احتفظ برمز الاستعادة لتسترجع حسابك على جهاز جديد.'),
      h('div', { class: 'linkbox ltr', dir: 'ltr' }, code), h('div', { class: 'row gap' }, h('button', { class: 'btn ghost grow', onclick: async () => toast((await copyText(code)) ? 'تم نسخ الرمز' : 'تعذّر النسخ', 'good') }, icon('copy', 18), ' نسخ الرمز'), h('button', { class: 'btn ghost grow', onclick: async e => { e.currentTarget.disabled = true; const ok = await backupNow(); toast(ok ? 'تم حفظ نسخة احتياطية ✅' : 'تعذّر الحفظ — تحقّق من الاتصال', ok ? 'good' : 'bad'); e.target.disabled = false; } }, 'حفظ الآن'))),
    h('div', { class: 'card' }, h('button', { class: 'btn danger wide', onclick: async () => { if (await confirmBox('سيُمسح تقدّمك على هذا الجهاز (الكلمات والملاحظات والسجل). حسابك وأصدقاؤك يبقون. هل أنت متأكد؟', 'مسح التقدّم', true)) { S.cards = {}; S.notes = {}; S.stars = {}; S.log = []; S.days = {}; S.xp = 0; S.pubXp = 0; S.streak = { n: 0, best: 0, last: '' }; S.totals = { sessions: 0, q: 0, ok: 0 }; saveNow(); save(); toast('تم المسح'); app.goto('home'); } } }, icon('trash', 18), ' مسح تقدّمي')),
    h('p', { class: 'muted center small' }, 'YZ English · النسخة 3'));
  stagger(el.children, { stagger: .05 });
  return { el };
}
