import { WORDS, BY_ID, wordOfDay, LEVELS, POS_AR } from '../words.js';
import { state, today, streakNow, lastDays, dayKey, levelInfo, subscribe } from '../store.js';
import * as SRS from '../srs.js';
import { h, icon, ring, avatar, stagger, ago, hl, countUp } from '../ui.js';
import { speak } from '../speech.js';
import { openWord } from './wordsheet.js';
import { MODES, availability } from './session.js';

const greet = () => { const x = new Date().getHours(); return x < 5 ? 'سهرة موفّقة' : x < 12 ? 'صباح الخير' : x < 18 ? 'مساء النور' : 'مساء الخير'; };

export function mount({ app }) {
  const el = h('section', { class: 'view home' });
  const render = () => {
    const S = state(); const m = S.me; const t = today(); const li = levelInfo(S.xp); const av = availability(); const cs = SRS.counts(); const lc = SRS.levelCounts();
    const goalP = Math.min(1, t.ok / S.settings.goal); const strk = streakNow();
    el.innerHTML = '';
    const parts = [];
    // الترويسة
    parts.push(h('header', { class: 'hd c-hd' }, h('div', { class: 'who' }, avatar(m.av, 48), h('div', {}, h('small', { class: 'muted' }, greet()), h('b', {}, m.name))), h('div', { class: 'lvchip' }, h('small', {}, 'المستوى'), h('b', {}, li.lv), h('div', { class: 'mini' }, h('i', { style: { width: li.pct * 100 + '%' } })), h('small', {}, `${li.into}/${li.need}`))));
    // تحدٍّ وارد
    if (app.inbox.length) parts.push(h('a', { class: 'banner c-ban', href: '#/friends' }, icon('sword', 22), h('div', {}, h('b', {}, `لديك ${app.inbox.length} تحدٍّ بانتظارك`), h('small', {}, 'اضغط لتقبل')), icon('back', 20, 'flip')));
    // خطة اليوم
    const primary = av.due ? { t: `راجع ${av.due} كلمة`, to: 'session/review', sub: 'حان وقت مراجعتها' } : av.fresh ? { t: 'تعلّم ٥ كلمات جديدة', to: 'session/learn', sub: 'ابدأ بكلمات جديدة' } : { t: 'اختبار سريع', to: 'session/quick', sub: '١٠ أسئلة' };
    parts.push(h('div', { class: 'card hero c-hero' }, h('div', { class: 'hero-l' }, h('div', { class: 'tag' }, 'خطّة اليوم'), h('h2', {}, goalP >= 1 ? 'أنجزت هدفك اليوم 🎉' : `أجب ${S.settings.goal - t.ok} إجابة صحيحة أخرى`), h('p', { class: 'muted' }, primary.sub), h('button', { class: 'btn primary', onclick: () => app.goto(primary.to) }, icon('bolt', 18), ' ', primary.t)),
      ring(goalP, { size: 112, stroke: 11, color: goalP >= 1 ? 'var(--gold)' : 'var(--ok)', inner: h('div', { class: 'ring-txt' }, h('b', {}, `${t.ok}`), h('small', {}, `/ ${S.settings.goal}`)) })));
    // دفتري والقراءة
    const fl = SRS.flagIds('l').length, fd = SRS.flagIds('d').length;
    parts.push(h('div', { class: 'card book c-book' }, h('div', { class: 'sec-h' }, h('b', {}, '📒 دفتري'), h('a', { class: 'link', href: '#/words' }, 'فتح الدفتر')),
      h('div', { class: 'bsum' }, h('div', { class: 'learn' }, h('b', {}, fl), h('small', {}, '🟡 أتعلّمها')), h('div', { class: 'done' }, h('b', {}, fd), h('small', {}, '✅ تعلّمتها'))),
      h('p', { class: 'muted' }, fl ? 'تدرّب على الكلمات التي علّمتها، وعندما تتقنها تتحوّل للأخضر.' : 'اقرأ فقرة واضغط أي كلمة لا تعرفها لتنتقل إلى دفترك.'),
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: () => app.goto('read') }, icon('book', 18), ' اقرأ فقرة'), fl ? h('button', { class: 'btn ghost grow', onclick: () => app.goto('session/mywords') }, 'راجع كلماتي') : null)));
    // السلسلة والأسبوع
    const wk = lastDays(7); const wkEl = h('div', { class: 'week' }, wk.map(d => { const r = S.days[dayKey(d)]; const on = r && r.q > 0; return h('div', { class: 'wd' + (on ? ' on' : '') + (dayKey(d) === dayKey() ? ' today' : '') }, h('i', {}, on ? icon('flame', 16) : ''), h('small', {}, d.toLocaleDateString('ar', { weekday: 'narrow' }))); }));
    parts.push(h('div', { class: 'card c-week' }, h('div', { class: 'sec-h' }, h('b', {}, strk ? `🔥 ${strk} ${strk === 1 ? 'يوم' : 'أيام'} متواصلة` : 'ابدأ سلسلة جديدة اليوم'), h('small', { class: 'muted' }, `أفضل سلسلة: ${S.streak.best}`)), wkEl));
    // تقدّم الإتقان
    const tot = WORDS.length; const seg = (n, c) => h('i', { class: c, style: { width: n / tot * 100 + '%' } });
    parts.push(h('div', { class: 'card c-prog' }, h('div', { class: 'sec-h' }, h('b', {}, 'تقدّمك في الكلمات'), h('small', { class: 'muted' }, `${tot - cs.new} من ${tot}`)),
      h('div', { class: 'stack' }, seg(cs.mastered, 'm'), seg(cs.known, 'k'), seg(cs.learning, 'l')),
      h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'm' }), `متقنة ${cs.mastered}`), h('span', {}, h('i', { class: 'k' }), `مألوفة ${cs.known}`), h('span', {}, h('i', { class: 'l' }), `قيد التعلّم ${cs.learning}`), h('span', {}, h('i', { class: 'n' }), `جديدة ${cs.new}`)),
      h('div', { class: 'lvbars' }, [1, 2, 3, 4].map(n => { const x = lc[n] || { total: 0, seen: 0, mastered: 0 }; return h('div', { class: 'lvb' }, h('small', {}, `${LEVELS[n].name}`), h('div', { class: 'mini' }, h('i', { class: 's', style: { width: x.seen / x.total * 100 + '%' } }), h('i', { class: 'mm', style: { width: x.mastered / x.total * 100 + '%' } })), h('small', { class: 'muted' }, `${x.seen}/${x.total}`)); }))));
    // كلمات تحتاج انتباهك
    const hard = SRS.hardIds().slice(0, 8);
    parts.push(h('div', { class: 'card c-hard' }, h('div', { class: 'sec-h' }, h('b', {}, 'كلمات تحتاج انتباهك'), hard.length ? h('a', { class: 'link', href: '#/session/mistakes' }, 'تدرّب عليها') : null),
      hard.length ? h('div', { class: 'hscroll' }, hard.map(id => { const w = BY_ID[id]; return h('button', { class: 'wcard', onclick: () => openWord(id) }, h('b', { dir: 'ltr' }, w.en), h('small', {}, w.ar), h('em', {}, `${S.cards[id].w} خطأ`)); })) : h('p', { class: 'muted' }, 'لا أخطاء حتى الآن. عندما تخطئ في كلمة ستظهر هنا لتعالجها.')));
    // اختبر نفسك
    parts.push(h('div', { class: 'grid2 c-tiles' }, ['quick', 'speed', 'listen', 'spell'].map(k => h('button', { class: 'tile ' + MODES[k].c, onclick: () => app.goto('session/' + k) }, icon(MODES[k].ic, 26), h('b', {}, MODES[k].name), h('small', {}, MODES[k].desc)))));
    // كلمة اليوم
    const wd = wordOfDay(); parts.push(h('div', { class: 'card wod c-wod' }, h('div', { class: 'tag' }, 'كلمة اليوم'), h('div', { class: 'row between' }, h('div', {}, h('div', { class: 'big-word', dir: 'ltr' }, wd.en), h('div', { class: 'muted' }, `${POS_AR[wd.pos]} · ${wd.ar}`)), h('button', { class: 'icon-btn say', onclick: () => speak(wd.en) }, icon('volume', 22))), h('p', { class: 'ex', dir: 'ltr', html: hl(wd.ex) }), h('button', { class: 'link', onclick: () => openWord(wd.id) }, 'التفاصيل والملاحظات')));
    // السجل
    parts.push(h('div', { class: 'card c-log' }, h('div', { class: 'sec-h' }, h('b', {}, 'سجلّ جلساتك'), h('small', { class: 'muted' }, `${S.totals.sessions} جلسة`)),
      S.log.length ? h('div', { class: 'list' }, S.log.slice(0, 5).map(l => { const md = MODES[l.mode] || MODES.quick; const acc = l.n ? Math.round(l.ok / l.n * 100) : 0; return h('div', { class: 'li' }, h('span', { class: 'ic ' + md.c }, icon(md.ic, 18)), h('div', { class: 'grow' }, h('b', {}, md.name), h('small', { class: 'muted' }, `${l.ok}/${l.n} · ${acc}% · ${ago(l.t)}`)), h('span', { class: 'xp', dir: 'ltr' }, `+${l.xp}`)); })) : h('p', { class: 'muted' }, 'ستظهر هنا جلساتك السابقة ونتائجها.')));
    // الملاحظات
    const notes = Object.keys(S.notes).filter(id => BY_ID[id]).slice(-3).reverse();
    parts.push(h('div', { class: 'card c-notes' }, h('div', { class: 'sec-h' }, h('b', {}, 'ملاحظاتك'), h('a', { class: 'link', href: '#/words' }, 'دفتري')),
      notes.length ? h('div', { class: 'list' }, notes.map(id => h('button', { class: 'li note-li', onclick: () => openWord(id) }, h('b', { dir: 'ltr' }, BY_ID[id].en), h('small', { class: 'muted' }, S.notes[id])))) : h('p', { class: 'muted' }, 'افتح أي كلمة في «دفتري» وأضف ملاحظة تساعدك على تذكّرها.')));
    // الأصدقاء
    const fr = app.friends.slice(0, 4);
    parts.push(h('div', { class: 'card c-fr' }, h('div', { class: 'sec-h' }, h('b', {}, 'أصدقاؤك'), h('a', { class: 'link', href: '#/friends' }, fr.length ? 'الكل' : 'ادعُ صديقًا')),
      fr.length ? h('div', { class: 'list' }, fr.map(f => h('div', { class: 'li' }, avatar(f.a, 36), h('div', { class: 'grow' }, h('b', {}, f.n), h('small', { class: 'muted' }, `${f.xp || 0} خبرة${f.online ? ' · متصل' : ''}`)), h('button', { class: 'btn sm ghost', onclick: () => app.goto('friends') }, 'تحدَّ')))) : h('p', { class: 'muted' }, 'التعلّم أمتع مع صديق. أرسل رابط دعوتك مرة واحدة، وبعدها تتحدّاه بضغطة.')));
    el.append(...parts);
    return parts;
  };
  const parts = render(); stagger(el.children, { stagger: .05 });
  let tm; const again = () => { clearTimeout(tm); tm = setTimeout(() => { if (!el.isConnected) return; const y = scrollY; render(); scrollTo(0, y); }, 250); };
  window.addEventListener('app:inbox', again); window.addEventListener('app:friends', again);
  const off = subscribe(() => { });
  return { el, destroy() { window.removeEventListener('app:inbox', again); window.removeEventListener('app:friends', again); off(); } };
}
