// تحدّي صديقين. نوعان: 'q' كلمات متدرّجة السهولة (١٠/٢٠/٣٠)، و'r' قراءة معًا (كل لاعب فقرته من نفس المستوى).
// كل لاعب يكتب إجاباته/تقدّمه فقط، والنتيجة تُحسب عند الطرفين من نفس البذرة، فلا مضيف يقود اللعبة.
import { tapSentence, sayRow, plain } from '../tap.js';
import { state, save, bumpDay, saveNow, pushLog } from '../store.js';
import * as SRS from '../srs.js';
import { duelQuestions, duelPoints, duelSecs, TYPES } from '../quiz.js';
import { readingPlan } from '../data/passages.js';
import { reader } from '../reader.js';
import { watchDuel, acceptDuel, declineDuel, cancelDuel, sendAnswer, sendProgress, finishDuel, dropDuel, serverNow, peek, createDuel, myPid } from '../net.js';
import { speak } from '../speech.js';
import { sfx, buzz } from '../sfx.js';
import { DUEL, XP } from '../config.js';
import { POS_AR } from '../words.js';
import { h, icon, avatar, toast, confetti, countUp, hl, confirmBox } from '../ui.js';
import { openForms } from './wordsheet.js';
import { flagCount } from '../flag.js';

export function mount({ args, app }) {
  const id = args[0]; const S = state(); const meP = myPid();
  const el = h('section', { class: 'view duel' }); const stage = h('div', { class: 'dstage' }); const top = h('div', { class: 'dtop' });
  el.append(top, stage);
  let d = null, opp = null, oppP = null, qs = null, plan = null, phase = 'load', qi = -1, locked = false, timer = null, startAt = 0, myAns = {}, done = false, unwatch = null, revealT = null, endTimer = null, topDrawn = false, rd = null, rdPeer = null, ri = 0, readyMe = 0, flags0 = flagCount();
  const isRead = () => d && d.k === 'r';
  const parse = v => { if (!v) return null; const [c, ms] = v.split(':'); return { c: +c, ms: +ms }; };
  const ansOf = (p, i) => parse(d && d.ans && d.ans[p] && d.ans[p][i]);
  const score = p => { let s = 0; if (!qs) return 0; qs.forEach((q, i) => { const a = ansOf(p, i); if (a) s += duelPoints(a.c === q.ans, a.ms, duelSecs(i)); }); return s; };
  const answered = p => d && d.ans && d.ans[p] ? Object.keys(d.ans[p]).length : 0;
  const prog = p => (d && d.p && d.p[p]) || 0;

  // ---- شريط علوي ثابت الأبعاد (لا يُعاد بناؤه ولا يتغيّر عرضه فلا اهتزاز)
  function drawTop() {
    if (!opp || topDrawn) return; topDrawn = true; top.innerHTML = '';
    top.append(h('button', { class: 'icon-btn', onclick: leave }, icon('x', 22)), h('div', { class: 'vs' },
      h('div', { class: 'pl' }, avatar(S.me.av, 34), h('b', {}, S.me.name), isRead() ? null : h('span', { class: 'sc', id: 'my' }, '0')),
      h('span', { class: 'x' }, isRead() ? '📖' : '⚔️'),
      h('div', { class: 'pl r' }, isRead() ? null : h('span', { class: 'sc', id: 'op' }, '0'), h('b', {}, opp.n), avatar(opp.a, 34))));
  }
  const setStage = n => { stage.innerHTML = ''; stage.append(n); gsap.fromTo(n, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .35, ease: 'power3.out', clearProps: 'all' }); };
  async function leave() { if (phase === 'play' || phase === 'read') { if (!await confirmBox(isRead() ? 'إنهاء جلسة القراءة؟' : 'الانسحاب يعني خسارة هذه المباراة. متأكد؟', isRead() ? 'إنهاء' : 'انسحاب', true)) return; } cleanup(); if (phase === 'wait' && d && d.a === meP) cancelDuel(id, d.b); app.goto('friends'); }
  function cleanup() { clearTimeout(timer); clearTimeout(revealT); clearTimeout(endTimer); unwatch && unwatch(); unwatch = null; rd && rd.destroy && rd.destroy(); rdPeer && rdPeer.destroy && rdPeer.destroy(); }

  function onData(v) {
    d = v; if (done) return;
    if (!d) { if (['load', 'wait', 'invite'].includes(phase)) { phase = 'gone'; setStage(h('div', { class: 'card center' }, h('h2', {}, 'انتهى التحدّي'), h('p', { class: 'muted' }, 'تم إلغاء هذا التحدّي أو حذفه.'), h('button', { class: 'btn primary', onclick: () => app.goto('friends') }, 'رجوع'))); } return; }
    if (meP !== d.a && meP !== d.b) { phase = 'gone'; setStage(h('div', { class: 'card center' }, h('p', {}, 'هذا التحدّي ليس لك.'))); return; }
    if (!oppP) { oppP = d.a === meP ? d.b : d.a; peek(oppP).then(p => { opp = p || { n: 'لاعب', a: '🙂' }; drawTop(); if (phase === 'invite') renderInvite(); if (phase === 'wait') renderWait(); }); }
    if (isRead()) plan = plan || readingPlan(d.seed, d.n); else qs = qs || duelQuestions(d.seed, d.n);
    if (d.st === 'no') { if (phase !== 'noed') { phase = 'noed'; cleanup(); setStage(h('div', { class: 'card center' }, h('h2', {}, d.a === meP ? 'رفض التحدّي 😕' : 'أُلغي التحدّي'), h('button', { class: 'btn primary', onclick: () => { dropDuel(id); app.goto('friends'); } }, 'رجوع'))); } return; }
    if (d.st === 'invite') { if (d.b === meP && phase !== 'invite') { phase = 'invite'; renderInvite(); } else if (d.a === meP && phase !== 'wait') { phase = 'wait'; renderWait(); } return; }
    if (d.st === 'play' || d.st === 'done') {
      if (['load', 'invite', 'wait'].includes(phase)) { if (isRead()) { phase = 'read'; startRead(); } else { phase = 'count'; startCountdown(); } }
      if (isRead()) syncRead(); else { drawScores(); checkAdvance(); checkEnd(); }
    }
  }

  const label = () => isRead() ? `قراءة معًا · ${d.n} فقرات بالتناوب` : `${d.n} كلمة · من السهل إلى الأصعب`;
  function renderInvite() { setStage(h('div', { class: 'card center big' }, opp ? avatar(opp.a, 84) : null, h('h2', {}, opp ? `${opp.n} يدعوك!` : 'تحدٍّ جديد'), h('p', { class: 'muted' }, label()), isRead() ? h('p', { class: 'muted small' }, 'تقرؤون معًا في المكالمة بالأدوار: فقرة لك يراها صديقك معك، ثم فقرة له تراها معه.') : h('p', { class: 'muted small' }, 'نبدأ بكلمات سهلة جدًا ثم نتدرّج ببطء، ووقت كافٍ لكل سؤال.'), h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: async e => { e.currentTarget.disabled = true; try { await acceptDuel(id, d.a); } catch (er) { toast('تعذّر القبول', 'bad'); e.target.disabled = false; } } }, 'قبول'), h('button', { class: 'btn ghost grow', onclick: async () => { await declineDuel(id, d.a); app.goto('friends'); } }, 'رفض')))); }
  function renderWait() { setStage(h('div', { class: 'card center big' }, opp ? avatar(opp.a, 84) : null, h('h2', {}, opp ? `بانتظار ${opp.n}…` : 'بانتظار الصديق…'), h('div', { class: 'spinner' }), h('p', { class: 'muted' }, 'وصله إشعار بالتحدّي. ستبدأ فور قبوله، ويمكنك البقاء هنا أو الرجوع لاحقًا.'), h('button', { class: 'btn ghost', onclick: leave }, 'إلغاء التحدّي'))); }

  // ================= تحدّي الكلمات =================
  function startCountdown() {
    startAt = (d.t0 || serverNow()) + DUEL.countdown; const n = h('div', { class: 'cd' }, '3'); setStage(h('div', { class: 'card center big' }, h('h2', {}, 'استعدا!'), n, h('p', { class: 'muted' }, 'نبدأ بكلمات سهلة ثم نتدرّج')));
    drawTop(); const tick = () => { const left = Math.ceil((startAt - serverNow()) / 1000); if (left <= 0) { phase = 'play'; return nextQ(); } if (n.textContent != left) { n.textContent = left; sfx.tick(); gsap.fromTo(n, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: .4, ease: 'back.out(2)' }); } timer = setTimeout(tick, 120); };
    tick();
  }

  function nextQ() {
    qi++; if (qi >= d.n) return waitEnd(); locked = false; const q = qs[qi]; const w = q.w; const secs = duelSecs(qi); const qStart = performance.now(); const say = () => speak(w.en);
    const timeEl = h('div', { class: 'tbar' }, h('i')); const opts = h('div', { class: 'opts' });
    let prompt;
    if (q.type === 'mean') prompt = h('div', { class: 'prompt' }, h('div', { class: 'big-word', dir: 'ltr' }, w.en), h('div', { class: 'muted' }, POS_AR[w.pos] || ''), h('button', { class: 'icon-btn say', onclick: say }, icon('volume', 22)));
    else if (q.type === 'rev') prompt = h('div', { class: 'prompt' }, h('div', { class: 'big-ar' }, w.ar));
    else if (q.type === 'listen') prompt = h('div', { class: 'prompt' }, h('button', { class: 'icon-btn say lg pulse', onclick: say }, icon('volume', 30)));
    else if (q.type === 'cloze') prompt = h('div', { class: 'prompt' }, h('p', { class: 'cloze', dir: 'ltr' }, q.sentence), h('div', { class: 'hint-ar' }, w.ar));
    else prompt = h('div', { class: 'prompt' }, h('p', { class: 'cloze', dir: 'ltr' }, w.def));
    const ltr = q.type !== 'mean';
    q.opts.forEach((t, i) => opts.append(h('button', { class: 'opt', dir: ltr ? 'ltr' : 'rtl', 'data-i': i, onclick: () => pick(i) }, h('kbd', {}, i + 1), h('span', {}, t))));
    const oppDot = h('div', { class: 'oppstat' }, h('i', { class: 'od' }), h('span', {}, 'صديقك يفكّر'));
    const learn = h('div', { class: 'learnbox', hidden: true });
    const card = h('div', { class: 'card q' }, h('div', { class: 'tag' }, `${qi + 1} / ${d.n} · ${TYPES[q.type]}`), prompt, opts, oppDot, learn);
    setStage(h('div', {}, timeEl, card));
    gsap.fromTo(timeEl.firstChild, { width: '100%' }, { width: '0%', duration: secs, ease: 'none' });
    if (q.type === 'listen' || q.type === 'mean') setTimeout(say, 350);
    Object.assign(q, { _opts: opts, _opp: oppDot, _learn: learn, _timeEl: timeEl, _revealed: false });
    clearTimeout(timer); timer = setTimeout(() => { if (!locked) { locked = true; lock(null); } reveal(); }, secs * 1000 + 200);
    function pick(i) { if (locked) return; locked = true; const ms = performance.now() - qStart; myAns[qi] = { c: i, ms }; sendAnswer(id, qi, i, ms).catch(() => toast('تعذّر إرسال إجابتك', 'bad')); lock(i); i === q.ans ? sfx.ok() : (sfx.bad(), buzz(40)); checkAdvance(); }
    function lock(i) { [...opts.children].forEach(b => { b.disabled = true; b.classList.add(i === null || +b.dataset.i !== i ? 'dim' : 'sel'); }); }
  }
  function setOpp(q, txt, cls) { if (!q._opp) return; q._opp.lastChild.textContent = txt; q._opp.className = 'oppstat ' + (cls || ''); }
  function checkAdvance() {
    if (phase !== 'play' || qi < 0 || qi >= d.n) return; const q = qs[qi]; if (!q._opts) return;
    const oa = ansOf(oppP, qi); if (oa && !q._revealed) setOpp(q, 'صديقك أجاب', 'on');
    if (locked && myAns[qi] && oa && !q._revealed) reveal();
  }
  // الكشف: يظهر الصحيح مع معنى الكلمة ومثالها وزر التصاريف ويبقى وقتًا كافيًا للفهم معًا
  function reveal() {
    const q = qs[qi]; if (!q || q._revealed || phase !== 'play') return; q._revealed = true; clearTimeout(timer); gsap.killTweensOf(q._timeEl.firstChild);
    [...q._opts.children].forEach(b => { const i = +b.dataset.i; b.classList.remove('sel', 'dim'); if (i === q.ans) b.classList.add('good'); });
    const my = myAns[qi], oa = ansOf(oppP, qi); if (my && my.c !== q.ans) q._opts.children[my.c].classList.add('bad');
    setOpp(q, oa ? (oa.c === q.ans ? 'صديقك أصاب' : 'صديقك أخطأ') : 'لم يجب صديقك', oa ? (oa.c === q.ans ? 'ok' : 'no') : '');
    const w = q.w; q._learn.hidden = false; q._learn.append(h('div', { class: 'lw' }, h('b', { dir: 'ltr' }, w.en), h('span', {}, w.ar), w.pos ? h('button', { class: 'icon-btn sm', onclick: () => openForms(w.id) }, icon('clock', 16)) : null), w.ex ? tapSentence(w.ex) : null, sayRow(w.en, w.ex));
    gsap.from(q._learn, { opacity: 0, y: 8, duration: .3 });
    const wait = qi < 10 ? 4500 : 3800; gsap.fromTo(q._timeEl.firstChild, { width: '100%', background: 'var(--ok)' }, { width: '0%', duration: wait / 1000, ease: 'none' });
    revealT = setTimeout(nextQ, wait);
  }
  function drawScores() { const a = document.getElementById('my'), b = document.getElementById('op'); if (a) a.textContent = score(meP); if (b) b.textContent = score(oppP); }
  function waitEnd() { phase = 'end'; setStage(h('div', { class: 'card center big' }, h('h2', {}, 'أنهيت أسئلتك'), h('div', { class: 'spinner' }), h('p', { class: 'muted' }, 'بانتظار إكمال صديقك…'))); endTimer = setTimeout(() => finishUp(), 20000); checkEnd(); }
  function checkEnd() { if (phase === 'end' && answered(oppP) >= d.n) finishUp(); }

  function finishUp() {
    if (done) return; done = true; cleanup(); phase = 'done';
    const a = score(meP), b = score(oppP); const res = a > b ? 'w' : a < b ? 'l' : 'd'; const gain = res === 'w' ? XP.duelWin : res === 'l' ? XP.duelLose : 25;
    let ok = 0; qs.forEach((q, i) => { const m = ansOf(meP, i); const c = !!m && m.c === q.ans; if (c) ok++; SRS.record(q.id, c); });
    const xp = gain + ok * 2 + Math.floor(d.n / 10) * 5; bumpDay(d.n, ok, xp);
    S.duels.unshift({ id, opp: opp ? opp.n : '؟', av: opp ? opp.a : '🙂', my: a, their: b, res, t: Date.now(), k: 'q' }); S.duels.length = Math.min(S.duels.length, 20); pushLog({ t: Date.now(), mode: 'duel', n: d.n, ok, xp, ms: 0 }); saveNow(); save();
    finishDuel(id); setTimeout(() => dropDuel(id), 8000);
    const xpEl = h('b', {}, '0');
    setStage(h('div', { class: 'card center big result' }, h('div', { class: 'trophy' }, res === 'w' ? '🏆' : res === 'l' ? '💪' : '🤝'), h('h2', {}, res === 'w' ? 'فزت!' : res === 'l' ? 'خسرت هذه الجولة' : 'تعادل!'),
      h('div', { class: 'vsr' }, h('div', {}, avatar(S.me.av, 52), h('b', {}, a), h('small', {}, S.me.name)), h('span', {}, '–'), h('div', {}, avatar(opp ? opp.a : '🙂', 52), h('b', {}, b), h('small', {}, opp ? opp.n : ''))),
      h('div', { class: 'stats3' }, h('div', {}, h('b', { dir: 'ltr' }, '+', xpEl), h('small', {}, 'خبرة')), h('div', {}, h('b', {}, `${ok}/${d.n}`), h('small', {}, 'إجاباتك الصحيحة'))),
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: async e => { e.currentTarget.disabled = true; try { const nid = await createDuel(oppP, { k: 'q', n: d.n }); app.goto('duel/' + nid); } catch (er) { toast('تعذّر إرسال التحدّي', 'bad'); e.target.disabled = false; } } }, 'إعادة التحدّي'), h('button', { class: 'btn ghost grow', onclick: () => app.goto('friends') }, 'رجوع'))));
    countUp(xpEl, xp, 1); if (res === 'w') { sfx.win(); confetti(90); }
  }

  // ================= قراءة معًا =================
  // ---- قراءة معًا بالأدوار: يقرأ لاعب فقرته والآخر يرى الفقرة نفسها معه مباشرة، ثم ينتقل الدور
  // التقدّم المخزَّن p = (عدد فقراتي المنتهية)×100 + (آخر جملة وصلتُ إليها). الدور الحالي = مجموع الفقرات المنتهية عند الاثنين.
  const doneOf = p => Math.floor(prog(p) / 100);
  const turnOf = () => doneOf(d.a) + doneOf(d.b);
  const readerOf = t => t % 2 === 0 ? d.a : d.b;
  const total = () => plan.length;
  let curT = -1, cursorSent = 0, cursorTimer = null, turnBusy = false;
  function startRead() { drawTop(); curT = -1; syncRead(); }
  function pushCursor(i) { // مؤشّر حيّ (تصاعدي فقط)
    const t = curT; if (readerOf(t) !== meP) return; const v = i + 1; if (v <= cursorSent) return; cursorSent = v;
    clearTimeout(cursorTimer); cursorTimer = setTimeout(() => sendProgress(id, Math.floor(t / 2) * 100 + v).catch(() => {}), 220);
  }
  function syncRead() {
    if (!d || !plan || done) return; const t = turnOf();
    if (t >= total()) return finishRead();
    if (t !== curT) return showTurn(t);
    const rp = readerOf(t); if (rp !== meP && rd) { const c = doneOf(rp) === Math.floor(t / 2) ? prog(rp) % 100 : 0; if (c > 0) rd.setCursor(c - 1, true); }
  }
  function showTurn(t) {
    if (turnBusy) return; if (!opp) { setTimeout(syncRead, 120); return; } const first = curT < 0; curT = t; turnBusy = true; cursorSent = 0;
    const build = () => {
      rd && rd.destroy && rd.destroy(); const rp = readerOf(t), mine = rp === meP, p = plan[t]; const who = mine ? S.me : opp || { n: 'صديقك', a: '🙂' };
      rd = reader(p, { onCursor: pushCursor });
      const banner = h('div', { class: 'turnbar' + (mine ? ' mine' : '') }, avatar(mine ? S.me.av : who.a, 40),
        h('div', { class: 'grow' }, h('b', {}, mine ? 'دورك الآن — اقرأ بصوتٍ عالٍ' : `دور ${who.n} — تابعه وساعده`), h('small', {}, mine ? 'صديقك يرى فقرتك الآن معك وسيساعدك' : 'تقرؤون الفقرة نفسها معًا، وسيُنهيها حين ينتهي')),
        h('span', { class: 'pill', dir: 'ltr' }, `${t + 1} / ${total()}`));
      const dots = h('div', { class: 'tdots' }, plan.map((_, k) => h('i', { class: k < t ? 'on' : k === t ? 'cur' : '' })));
      const btn = mine ? h('button', { class: 'btn primary wide', onclick: () => { btn.disabled = true; clearTimeout(cursorTimer); sfx.ok(); sendProgress(id, (Math.floor(t / 2) + 1) * 100).then(() => { d.p = Object.assign({}, d.p, { [meP]: (Math.floor(t / 2) + 1) * 100 }); syncRead(); }).catch(() => { btn.disabled = false; toast('تعذّر الإرسال', 'bad'); }); } }, t + 1 >= total() ? 'أنهيت — إنهاء الجلسة 🎉' : 'أنهيت القراءة — دور صديقي')
        : h('div', { class: 'waitbar' }, h('i', { class: 'od' }), h('span', {}, `${who.n} يقرأ… تابع معه ✨`));
      const tip = h('p', { class: 'muted small tipline' }, `المستوى ${p.lv} · ${mine ? 'اقرأها لصديقك، وهو سيصحّح لك ويشرح ما صعب' : 'ساعده إن تعثّر: اضغط أي كلمة لمعناها، وأضفها لدفترك'}`);
      const card = h('div', { class: 'card rcard' }, tip, rd);
      const view = h('div', { class: 'rview' }, banner, dots, card, btn);
      stage.innerHTML = ''; stage.append(view); el._rs = { view };
      const tl = gsap.timeline({ onComplete: () => { turnBusy = false; syncRead(); } });
      tl.fromTo(view, { opacity: 0, x: mine ? -40 : 40 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out', clearProps: 'transform,opacity' })
        .from(banner, { y: -16, opacity: 0, duration: .4, ease: 'back.out(1.6)' }, '<.05').from(dots.children, { scale: 0, duration: .25, stagger: .015 }, '<.1')
        .from(card, { y: 24, opacity: 0, duration: .45, ease: 'power3.out' }, '<.1');
      if (!first) { sfx.pop && sfx.pop(); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }
    };
    const old = stage.firstElementChild;
    if (first || !old) build(); else gsap.to(old, { opacity: 0, x: (readerOf(t) === meP) ? 40 : -40, duration: .28, ease: 'power2.in', onComplete: build });
  }
  function finishRead() {
    if (done) return; done = true; cleanup(); phase = 'done'; const n = total(); const flagged = Math.max(0, flagCount() - flags0); const xp = n * 15 + flagged * 3; bumpDay(0, 0, xp);
    S.duels.unshift({ id, opp: opp ? opp.n : '؟', av: opp ? opp.a : '🙂', my: n, their: n, res: 'r', t: Date.now(), k: 'r' }); S.duels.length = Math.min(S.duels.length, 20); pushLog({ t: Date.now(), mode: 'duel', n, ok: n, xp, ms: 0 }); saveNow(); save(); finishDuel(id); setTimeout(() => dropDuel(id), 8000);
    const xpEl = h('b', {}, '0');
    setStage(h('div', { class: 'card center big result' }, h('div', { class: 'trophy' }, '📖'), h('h2', {}, 'أنهيتما القراءة معًا!'), h('p', { class: 'muted' }, `قرأتما ${n} فقرات وعلّمت ${flagged} كلمة جديدة في دفترك`), h('div', { class: 'stats3' }, h('div', {}, h('b', { dir: 'ltr' }, '+', xpEl), h('small', {}, 'خبرة')), h('div', {}, h('b', {}, n), h('small', {}, 'فقرات')), h('div', {}, h('b', {}, flagged), h('small', {}, 'كلمات جديدة'))),
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: () => app.goto('session/mywords') }, 'تدرّب على كلماتك'), h('button', { class: 'btn ghost grow', onclick: () => app.goto('friends') }, 'رجوع'))));
    countUp(xpEl, xp, 1); sfx.win(); confetti(70);
  }

  unwatch = watchDuel(id, onData);
  setStage(h('div', { class: 'card center big' }, h('div', { class: 'spinner' })));
  return { el, destroy() { cleanup(); try { speechSynthesis.cancel(); } catch (e) {} } };
}
