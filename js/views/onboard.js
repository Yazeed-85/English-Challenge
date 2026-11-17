import { createLocalProfile, restoreByCode } from '../identity.js';
import { AVATARS } from '../config.js';
import { state, save } from '../store.js';
import { LEVELS } from '../words.js';
import { h, icon, toast, sheet } from '../ui.js';

export function mount({ app }) {
  const el = h('section', { class: 'view onboard' });
  const d = { name: '', av: AVATARS[Math.floor(Math.random() * AVATARS.length)], level: 1, goal: 20 };
  const joined = !!state().pendingJoin;
  const steps = [];

  const s1 = () => h('div', { class: 'ob' },
    h('div', { class: 'logo' }, h('img', { src: 'assets/icon.svg', alt: 'YZ English' })),
    h('h1', {}, 'YZ English'),
    h('p', { class: 'lead' }, 'تعلّم الإنجليزية بذكاء: يراجع لك الكلمات في وقتها المناسب، ويتحدّاك أصدقاؤك لتتقدّم أسرع.'),
    joined ? h('div', { class: 'note-box' }, '🎉 دعاك صديق للانضمام — أكمل إعداد حسابك وسيُضاف إلى أصدقائك تلقائيًا.') : null,
    h('ul', { class: 'perks' }, h('li', {}, icon('brain', 20), ' مراجعة ذكية بالتكرار المتباعد'), h('li', {}, icon('target', 20), ' تتبّع تقدّمك وأخطائك وملاحظاتك'), h('li', {}, icon('sword', 20), ' تحدَّ أصدقاءك مباشرة')),
    h('button', { class: 'btn primary wide', onclick: () => go(1) }, 'ابدأ'),
    h('button', { class: 'link', onclick: restore }, 'لدي حساب سابق'));

  const s2 = () => {
    const inp = h('input', { class: 'inp', maxlength: 20, placeholder: 'اسمك', value: d.name }); inp.addEventListener('input', () => d.name = inp.value);
    const grid = h('div', { class: 'av-grid' }, AVATARS.map(a => h('button', { class: 'av' + (a === d.av ? ' on' : ''), onclick: e => { d.av = a; [...grid.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); gsap.fromTo(e.currentTarget, { scale: .8 }, { scale: 1, duration: .3, ease: 'back.out(3)' }); } }, a)));
    return h('div', { class: 'ob' }, h('h2', {}, 'من أنت؟'), h('label', { class: 'lbl' }, 'الاسم الذي يراه أصدقاؤك'), inp, h('label', { class: 'lbl' }, 'اختر صورتك'), grid,
      h('button', { class: 'btn primary wide', onclick: () => { if (!d.name.trim()) { toast('اكتب اسمك أولًا', 'bad'); inp.focus(); return; } go(2); } }, 'التالي'));
  };

  const s3 = () => {
    const lv = h('div', { class: 'choices' }, [1, 2, 3].map(n => h('button', { class: 'choice' + (d.level === n ? ' on' : ''), onclick: e => pickOne(e, () => d.level = n) }, h('b', {}, LEVELS[n].name), h('small', {}, ['كلمات يومية بسيطة', 'كلمات العمل والدراسة', 'مفردات متقدّمة'][n - 1]))));
    const goal = h('div', { class: 'choices row3' }, [10, 20, 40].map(n => h('button', { class: 'choice' + (d.goal === n ? ' on' : ''), onclick: e => pickOne(e, () => d.goal = n) }, h('b', {}, n), h('small', {}, ['خفيف', 'متوازن', 'جاد'][[10, 20, 40].indexOf(n)]))));
    return h('div', { class: 'ob' }, h('h2', {}, 'من أين نبدأ؟'), h('label', { class: 'lbl' }, 'مستواك الحالي'), lv, h('label', { class: 'lbl' }, 'هدفك اليومي (إجابات صحيحة)'), goal,
      h('button', { class: 'btn primary wide', onclick: finish }, 'ابدأ رحلتي 🚀'));
  };
  function pickOne(e, fn) { fn(); [...e.currentTarget.parentNode.children].forEach(x => x.classList.toggle('on', x === e.currentTarget)); }

  const all = [s1, s2, s3]; let cur = 0; const stage = h('div', { class: 'ob-stage' }); const dots = h('div', { class: 'ob-dots' }, [0, 1, 2].map(() => h('i')));
  function show(i, dir = 1) { const n = all[i](); const old = stage.firstChild; const place = () => { stage.innerHTML = ''; stage.append(n); gsap.fromTo(n, { x: -60 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: .45, ease: 'power3.out', clearProps: 'all' }); gsap.from(n.children, { y: 16, opacity: 0, stagger: .05, duration: .4, delay: .1, clearProps: 'all' }); }; [...dots.children].forEach((x, k) => x.classList.toggle('on', k === i)); old ? gsap.to(old, { x: 60 * dir, opacity: 0, duration: .18, onComplete: place }) : place(); }
  function go(i) { cur = i; show(i); }
  function finish() { createLocalProfile({ name: d.name.trim(), av: d.av, level: d.level, goal: d.goal }); save(); app.startOnline(); app.goto('home', true); }
  function restore() {
    const inp = h('input', { class: 'inp ltr', dir: 'ltr', maxlength: 12, placeholder: 'رمز الاستعادة (12 حرفًا)' });
    const btn = h('button', { class: 'btn primary wide', onclick: async () => { btn.disabled = true; btn.textContent = '…'; try { await restoreByCode(inp.value); s.close(); app.startOnline(); app.goto('home', true); toast('تمت استعادة حسابك ✅', 'good'); } catch (e) { toast(e.message, 'bad'); btn.disabled = false; btn.textContent = 'استعادة'; } } }, 'استعادة');
    const s = sheet(h('div', { class: 'confirm' }, h('p', {}, 'أدخل رمز الاستعادة الذي تجده في صفحة «أنا» على جهازك القديم.'), inp, btn), { title: 'استعادة حساب' });
  }
  el.append(stage, dots); show(0);
  return { el };
}
