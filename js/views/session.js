// جلسة التدرّب: مراجعة ذكية / تعلّم جديد / اختبار سريع / سرعة / استماع / إملاء / أكمل الجملة / أخطائي.
import { WORDS, BY_ID, POS_AR } from '../words.js';
import { state, save, bumpDay, today, pushLog, levelInfo, saveNow } from '../store.js';
import * as SRS from '../srs.js';
import { makeQ, shuffle, rng, TYPES, typeFor, norm } from '../quiz.js';
import { BASIC } from '../data/basic.js';
import { IRR_VERBS } from '../data/irregular.js';
import { speak } from '../speech.js';
import { sfx, buzz } from '../sfx.js';
import { h, icon, toast, hl, ring, countUp, confetti, stagger, confirmBox } from '../ui.js';
import { openWord, openForms } from './wordsheet.js';
import { isLearning } from '../flag.js';
import { XP } from '../config.js';

export const MODES = {
  review: { name: 'المراجعة الذكية', ic: 'brain', c: 'violet', desc: 'كلمات حان وقت مراجعتها' },
  learn: { name: 'كلمات جديدة', ic: 'sparkle', c: 'mint', desc: '٥ كلمات جديدة بالشرح ثم اختبار' },
  quick: { name: 'اختبار سريع', ic: 'bolt', c: 'amber', desc: '١٠ أسئلة منوّعة من تقدّمك' },
  speed: { name: 'تحدّي السرعة', ic: 'clock', c: 'coral', desc: 'دقيقة واحدة، كم تجيب؟' },
  listen: { name: 'استماع', ic: 'ear', c: 'sky', desc: 'اسمع الكلمة واختر الصحيحة' },
  spell: { name: 'إملاء', ic: 'pencil', c: 'violet', desc: 'اسمع واكتب الكلمة بنفسك' },
  cloze: { name: 'أكمل الجملة', ic: 'note', c: 'mint', desc: 'الكلمة الناقصة في جملة' },
  mywords: { name: 'كلماتي (دفتري)', ic: 'book', c: 'gold', desc: 'الكلمات التي علّمتها بالأصفر' },
  mistakes: { name: 'أخطائي', ic: 'target', c: 'coral', desc: 'الكلمات التي تتعثّر فيها' },
  forms: { name: 'لعبة التصاريف', ic: 'clock', c: 'sky', desc: 'الماضي والـ ing واسم المفعول للأفعال' },
  word: { name: 'تدرّب على كلمة', ic: 'target', c: 'violet', desc: '' }
};

function pool(level) { // كلمات مألوفة للمستخدم (أو من مستواه إن لم يتعلّم شيئًا)
  const S = state(); const seen = Object.keys(S.cards).filter(id => BY_ID[id]);
  return seen.length >= 8 ? seen : [...new Set([...seen, ...WORDS.filter(w => w.lvl <= level).map(w => w.id)])];
}
export function availability() {
  const S = state(); const lv = S.settings.level;
  return { flag: SRS.flagIds('l').length, due: SRS.dueIds().length, hard: SRS.hardIds().length, fresh: SRS.newIds(lv, 5).length, seen: Object.keys(S.cards).length };
}

function build(mode, arg) {
  const S = state(); const lv = S.settings.level; const items = []; const r = Math.random;
  const add = (id, type) => items.push({ id, type: type || typeFor(S.cards[id], r) });
  if (mode === 'review') SRS.dueIds().slice(0, 15).forEach(id => add(id));
  else if (mode === 'learn') { const ids = SRS.newIds(lv, 5); ids.forEach(id => items.push({ id, intro: true })); ids.forEach(id => add(id, 'mean')); shuffle(ids, r).forEach(id => add(id, r() < .5 ? 'rev' : 'listen')); }
  else if (mode === 'quick') {
    const ids = new Set([...SRS.dueIds().slice(0, 5), ...SRS.hardIds().slice(0, 3)]);
    const p = shuffle(pool(lv), r); for (const id of p) { if (ids.size >= 10) break; ids.add(id); }
    shuffle([...ids], r).forEach(id => add(id));
  }
  else if (mode === 'listen' || mode === 'spell' || mode === 'cloze') { const p = shuffle(pool(lv), r); const due = SRS.dueIds(); const ids = [...new Set([...due.slice(0, 4), ...p])].slice(0, mode === 'spell' ? 8 : 10); ids.forEach(id => add(id, mode)); }
  else if (mode === 'mywords') { const ids = shuffle(SRS.flagIds('l'), r).slice(0, 12); ids.filter(id => !S.cards[id] || S.cards[id].s === 0).slice(0, 5).forEach(id => items.push({ id, intro: true })); ids.forEach(id => add(id, 'mean')); ids.forEach(id => add(id)); }
  else if (mode === 'forms') { const irr = Object.keys(IRR_VERBS).filter(k => !['be', 'can', 'will', 'stand_'].includes(k)); const reg = WORDS.filter(w => w.pos === 'v').map(w => w.id); shuffle([...irr, ...irr, ...reg.slice(0, 20)], r).filter((x, i, a) => a.indexOf(x) === i).slice(0, 10).forEach(id => add(id, 'form')); }
  else if (mode === 'mistakes') SRS.hardIds().slice(0, 12).forEach(id => add(id));
  else if (mode === 'word') add(arg, 'mean'), add(arg, 'rev'), add(arg, 'cloze'), add(arg, 'spell');
  else if (mode === 'speed') { for (const id of shuffle(pool(lv), r)) add(id, r() < .6 ? 'mean' : 'rev'); }
  return items;
}

export function mount({ args, app }) {
  const mode = MODES[args[0]] ? args[0] : 'quick'; const arg = args[1];
  const S = state(); const info = MODES[mode];
  const el = h('section', { class: 'view session' });
  const items = build(mode, arg);
  const quizCount = items.filter(i => !i.intro).length;
  if (!quizCount) {
    el.append(h('div', { class: 'empty-state' }, icon(info.ic, 56), h('h2', {}, 'لا يوجد ما تتدرّب عليه الآن'), h('p', { class: 'muted' }, mode === 'mywords' ? 'دفترك لا يحوي كلمات تتعلّمها الآن. اقرأ فقرة وعلّم الكلمات التي لا تعرفها.' : mode === 'mistakes' ? 'لا أخطاء مسجّلة — ممتاز! جرّب الاختبار السريع.' : mode === 'review' ? 'لا كلمات مستحقّة للمراجعة. تعلّم كلمات جديدة أو جرّب اختبارًا سريعًا.' : 'لا كلمات جديدة متاحة في مستواك، غيّره من «أنا».'), h('button', { class: 'btn primary', onclick: () => app.goto('practice') }, 'رجوع')));
    return { el };
  }
  const speed = mode === 'speed';
  let idx = 0, first = 0, okCount = 0, xp = 0, combo = 0, bestCombo = 0; const missed = [], seenFirst = new Set(), requeued = new Set();
  let timeLeft = 60, timer = null, locked = false, finished = false; const t0 = Date.now();
  const lvBefore = levelInfo(S.xp).lv;

  const bar = h('div', { class: 'bar' }, h('i'));
  const comboEl = h('div', { class: 'combo', hidden: true });
  const clock = speed ? h('div', { class: 'clock' }, '60') : null;
  const top = h('div', { class: 'stop' }, h('button', { class: 'icon-btn', 'aria-label': 'خروج', onclick: quit }, icon('x', 22)), bar, speed ? clock : h('div', { class: 'counter' }, '0/' + quizCount), comboEl);
  const stage = h('div', { class: 'stage' });
  el.append(top, stage);

  async function quit() { if (finished || idx === 0 || await confirmBox('تريد إنهاء الجلسة؟ تقدّمك في الإجابات السابقة محفوظ.', 'إنهاء', true)) { clearInterval(timer); if (!finished && first > 0) return finish(true); app.goto('home'); } }

  function setProgress() { gsap.to(bar.firstChild, { width: (speed ? (60 - timeLeft) / 60 : first / quizCount) * 100 + '%', duration: .4 }); if (!speed) top.querySelector('.counter').textContent = `${Math.min(first, quizCount)}/${quizCount}`; }

  function next() {
    if (finished) return;
    if (!speed && first >= quizCount && !items.slice(idx).some(i => !i.intro)) return finish();
    if (idx >= items.length) return speed ? (idx = 0, next()) : finish();
    const it = items[idx++]; locked = false;
    if (it.intro) return showIntro(it);
    const q = makeQ(it.id, it.type, Math.random); q.retry = requeued.has(it.id) && seenFirst.has(it.id);
    showQ(q);
  }

  function showIntro(it) {
    const w = BY_ID[it.id]; const n = items.filter(i => i.intro).length; const k = items.filter(i => i.intro).indexOf(it) + 1;
    speak(w.en);
    const card = h('div', { class: 'card intro' },
      h('div', { class: 'tag' }, `كلمة جديدة ${k}/${n}`),
      h('div', { class: 'big-word', dir: 'ltr' }, w.en),
      h('div', { class: 'muted', dir: 'ltr' }, POS_AR[w.pos]),
      h('button', { class: 'icon-btn say lg', onclick: () => speak(w.en) }, icon('volume', 26)),
      h('div', { class: 'ar-mean' }, w.ar), h('p', { class: 'def', dir: 'ltr' }, w.def), h('p', { class: 'ex', dir: 'ltr', html: hl(w.ex || '') }),
      h('button', { class: 'btn ghost sm', onclick: () => speak(w.ex || w.en) }, icon('volume', 18), ' اسمع الجملة'),
      h('button', { class: 'btn primary wide', onclick: () => swap(next) }, k < n ? 'التالي' : 'ابدأ الاختبار'));
    swap(null, card);
  }

  function swap(cb, content) {
    const old = stage.firstChild;
    const place = () => { stage.innerHTML = ''; if (content) { stage.append(content); gsap.fromTo(content, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: .38, ease: 'power3.out', clearProps: 'all' }); } cb && cb(); };
    if (old) gsap.to(old, { x: 40, opacity: 0, duration: .18, onComplete: place }); else place();
  }

  function showQ(q) {
    const w = q.w; let card;
    const say = () => speak(w.en);
    const head = h('div', { class: 'tag' }, q.retry ? 'محاولة ثانية 🔁' : TYPES[q.type]);
    if (q.type === 'spell') {
      const inp = h('input', { class: 'spell', dir: 'ltr', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: 'اكتب هنا…' });
      const go = () => { if (locked || !inp.value.trim()) return; answer(norm(inp.value) === norm(w.en), inp.value.trim(), q, inp); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      card = h('div', { class: 'card q' }, head, h('button', { class: 'icon-btn say lg pulse', onclick: say }, icon('volume', 30)), h('div', { class: 'hint-ar' }, w.ar), h('button', { class: 'link', onclick: () => speak(w.en, true) }, '🐢 أبطأ'), inp, h('button', { class: 'btn primary wide', onclick: go }, 'تحقّق'));
      swap(null, card); setTimeout(() => { inp.focus(); say(); }, 380);
    } else {
      let prompt;
      if (q.type === 'mean') prompt = h('div', { class: 'prompt' }, h('div', { class: 'big-word' + (isLearning(w.id) ? ' fl' : ''), dir: 'ltr' }, w.en), h('div', { class: 'muted' }, POS_AR[w.pos] || ''), h('button', { class: 'icon-btn say', onclick: say }, icon('volume', 22)));
      else if (q.type === 'rev') prompt = h('div', { class: 'prompt' }, h('div', { class: 'big-ar' }, w.ar), h('div', { class: 'muted' }, POS_AR[w.pos]));
      else if (q.type === 'listen') prompt = h('div', { class: 'prompt' }, h('button', { class: 'icon-btn say lg pulse', onclick: say }, icon('volume', 30)), h('button', { class: 'link', onclick: () => speak(w.en, true) }, '🐢 أبطأ'));
      else if (q.type === 'cloze') prompt = h('div', { class: 'prompt' }, h('p', { class: 'cloze', dir: 'ltr' }, q.sentence), h('div', { class: 'hint-ar' }, w.ar));
      else if (q.type === 'form') prompt = h('div', { class: 'prompt' }, h('div', { class: 'big-word', dir: 'ltr' }, q.prompt), h('div', { class: 'hint-ar' }, `${w.ar} — ${q.label}`));
      else prompt = h('div', { class: 'prompt' }, h('p', { class: 'cloze', dir: 'ltr' }, w.def));
      const ltr = q.type !== 'mean';
      const opts = h('div', { class: 'opts' }, q.opts.map((t, i) => h('button', { class: 'opt', dir: ltr ? 'ltr' : 'rtl', 'data-i': i, onclick: () => pick(i) }, h('kbd', {}, i + 1), h('span', {}, t))));
      const pick = i => { if (locked) return; answer(i === q.ans, i, q, opts); };
      card = h('div', { class: 'card q' }, head, prompt, opts);
      swap(null, card);
      gsap.from(opts.children, { y: 18, opacity: 0, duration: .4, stagger: .05, delay: .12, ease: 'power3.out', clearProps: 'all' });
      if (q.type === 'listen' || (q.type === 'mean' && !speed)) setTimeout(say, 380);
    }
    q._card = card;
  }

  function answer(ok, chosen, q, holder) {
    locked = true; const w = q.w; const retry = q.retry; const card = q._card;
    if (q.type === 'spell') { holder.disabled = true; holder.classList.add(ok ? 'good' : 'bad'); card.querySelector('.btn.primary').remove(); }
    else { [...holder.children].forEach((b, i) => { b.disabled = true; if (i === q.ans) b.classList.add('good'); else if (i === chosen) b.classList.add('bad'); else b.classList.add('dim'); }); }
    if (!retry && !seenFirst.has(q.id)) { // أول محاولة فقط تُسجَّل في التكرار المتباعد والخبرة
      seenFirst.add(q.id); first++;
      if (q.type !== 'form') SRS.record(q.id, ok);
      const gain = ok ? (speed ? 5 : XP.correct) : 0; if (ok) { okCount++; xp += gain; combo++; bestCombo = Math.max(bestCombo, combo); } else { combo = 0; missed.push(q.id); }
      bumpDay(1, ok ? 1 : 0, gain);
      if (!ok && !speed && !requeued.has(q.id)) { requeued.add(q.id); items.push({ id: q.id, type: 'mean' }); }
    } else if (!ok) combo = 0;
    comboEl.hidden = combo < 3; comboEl.textContent = `🔥 ${combo}`; if (combo >= 3) gsap.fromTo(comboEl, { scale: 1.5 }, { scale: 1, duration: .35, ease: 'back.out(2)' });
    ok ? sfx.ok() : (sfx.bad(), buzz(60));
    if (!ok) gsap.fromTo(card, { x: -10 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' });
    setProgress();
    if (speed) { if (!ok) { timeLeft = Math.max(0, timeLeft - 5); clock.textContent = timeLeft; gsap.fromTo(clock, { color: '#ff5c7a' }, { color: '#fff', duration: .6 }); } setTimeout(() => { if (timeLeft > 0) next(); }, ok ? 350 : 800); return; }
    feedback(ok, q, chosen);
  }

  function feedback(ok, q, chosen) {
    const w = q.w; const fb = h('div', { class: 'fb ' + (ok ? 'good' : 'bad') },
      h('div', { class: 'fb-head' }, icon(ok ? 'check' : 'x', 22), h('b', {}, ok ? pick2(['أحسنت!', 'ممتاز!', 'صحيح!', 'رائع!']) : 'ليست الصحيحة')),
      h('div', { class: 'fb-word' }, h('span', { dir: 'ltr', class: 'en' + (isLearning(w.id) ? ' fl' : '') }, w.en), h('span', { class: 'ar' }, w.ar), h('button', { class: 'icon-btn sm', onclick: () => speak(w.en) }, icon('volume', 18))),
      h('p', { class: 'ex', dir: 'ltr', html: hl(w.ex || '') }),
      h('div', { class: 'row gap' }, q.type !== 'form' ? h('button', { class: 'btn ghost sm', onclick: () => openWord(w.id) }, icon('note', 18), ' ملاحظة') : null, w.pos ? h('button', { class: 'btn ghost sm', onclick: () => openForms(q.type === 'form' ? q.id : w.id) }, icon('clock', 18), ' تصاريف') : null, h('button', { class: 'btn primary grow', id: 'nxt', onclick: () => go() }, 'التالي')));
    const go = () => { document.removeEventListener('keydown', key); gsap.to(fb, { yPercent: 100, duration: .2, onComplete: () => { fb.remove(); next(); } }); };
    const key = e => { if (e.key === 'Enter' && !document.querySelector('.sheet')) go(); }; document.addEventListener('keydown', key);
    el.append(fb); gsap.fromTo(fb, { yPercent: 100 }, { yPercent: 0, duration: .35, ease: 'power3.out' });
    if (ok) speak(w.en);
  }
  const pick2 = a => a[Math.floor(Math.random() * a.length)];

  // اختصارات لوحة المفاتيح 1-4
  const onKey = e => { if (/^[1-4]$/.test(e.key) && !locked) { const b = el.querySelector(`.opt[data-i="${+e.key - 1}"]`); b && b.click(); } };
  document.addEventListener('keydown', onKey);

  function finish(early = false) {
    if (finished) return; finished = true; clearInterval(timer);
    const acc = first ? okCount / first : 0; let bonus = 0;
    if (!speed && first >= 5 && acc >= .8) bonus += XP.bonus;
    const d = today(); const dayRec = S.days[Object.keys(S.days).sort().pop()];
    const k = Object.keys(S.days).sort().pop(); const rec = S.days[k];
    let goalHit = false; if (rec && rec.ok >= S.settings.goal && !rec.g) { rec.g = 1; bonus += XP.goal; goalHit = true; }
    if (bonus) bumpDay(0, 0, bonus);
    xp += bonus; S.totals.q += first; S.totals.ok += okCount;
    pushLog({ t: Date.now(), mode, n: first, ok: okCount, xp, ms: Date.now() - t0 }); saveNow();
    const lvAfter = levelInfo(S.xp).lv;
    swap(null, resultCard({ acc, bonus, goalHit, leveled: lvAfter > lvBefore, lvAfter }));
    el.querySelector('.stop') && gsap.to(top, { opacity: 0, duration: .2 });
  }

  function resultCard({ acc, bonus, goalHit, leveled, lvAfter }) {
    const xpEl = h('b', {}, '0'); const good = acc >= .7 || speed;
    const card = h('div', { class: 'card result' },
      h('div', { class: 'tag' }, info.name),
      ring(speed ? 1 : acc, { size: 150, stroke: 14, color: good ? 'var(--ok)' : 'var(--gold)', inner: h('div', { class: 'ring-txt' }, h('b', {}, speed ? String(okCount) : Math.round(acc * 100) + '%'), h('small', {}, speed ? 'إجابة صحيحة' : 'دقّة'))}),
      h('h2', {}, good ? pick2(['عمل رائع! 🎉', 'أداء ممتاز! 🌟', 'تقدّم جميل! 💪']) : 'لا بأس، التكرار يصنع الإتقان 💡'),
      h('div', { class: 'stats3' }, h('div', {}, h('b', {}, '+', xpEl), h('small', {}, 'خبرة')), h('div', {}, h('b', {}, `${okCount}/${first}`), h('small', {}, 'صحيحة')), h('div', {}, h('b', {}, bestCombo), h('small', {}, 'أفضل تتابع'))),
      bonus ? h('div', { class: 'chips' }, bonus >= XP.bonus && !goalHit || bonus > XP.goal ? h('span', { class: 'chip good' }, `+${XP.bonus} مكافأة دقّة`) : null, goalHit ? h('span', { class: 'chip good' }, `🎯 +${XP.goal} هدف اليوم`) : null) : null,
      leveled ? h('div', { class: 'levelup' }, `⬆️ ارتقيت إلى المستوى ${lvAfter}!`) : null,
      missed.length ? h('div', { class: 'missed' }, h('div', { class: 'lbl' }, 'كلمات تحتاج مراجعة'), h('div', { class: 'wl' }, [...new Set(missed)].map(id => h('button', { class: 'wchip', dir: 'ltr', onclick: () => BY_ID[id] && openWord(id) }, (BY_ID[id] || BASIC[id] || { en: id }).en)))) : null,
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: () => location.hash === '#/session/' + args.join('/') ? app.goto('session/' + args.join('/'), true) : app.goto('session/' + args.join('/')) }, 'جلسة أخرى'), h('button', { class: 'btn ghost grow', onclick: () => app.goto('home') }, 'الرئيسية')));
    setTimeout(() => { countUp(xpEl, xp, 1.1); if (good) { sfx.win(); confetti(80); } }, 300);
    return card;
  }

  // مؤقّت السرعة
  function startSpeed() {
    timer = setInterval(() => { timeLeft--; clock.textContent = Math.max(0, timeLeft); if (timeLeft <= 5 && timeLeft > 0) sfx.tick(); setProgress(); if (timeLeft <= 0) { clearInterval(timer); finish(); } }, 1000);
  }
  const startBtn = h('div', { class: 'card intro' }, h('div', { class: 'tag' }, info.name), icon(info.ic, 56, 'big-ico'), h('h2', {}, info.name), h('p', { class: 'muted' }, speed ? 'لديك ٦٠ ثانية. الخطأ يخصم ٥ ثوانٍ. جاهز؟' : info.desc), h('button', { class: 'btn primary wide', onclick: () => { swap(next); if (speed) startSpeed(); } }, speed ? 'ابدأ!' : 'هيا نبدأ'));
  if (speed || mode === 'review' || mode === 'mistakes' || mode === 'mywords') stage.append(startBtn); else queueMicrotask(next);

  return { el, destroy() { clearInterval(timer); document.removeEventListener('keydown', onKey); try { speechSynthesis.cancel(); } catch (e) {} }, after() { gsap.from(top, { y: -20, opacity: 0, duration: .4 }); } };
}
