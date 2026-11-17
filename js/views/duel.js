// تحدّي صديقين. نوعان: 'q' كلمات متدرّجة السهولة (١٠/٢٠/٣٠)، و'r' قراءة معًا (كل لاعب فقرته من نفس المستوى).
// كل لاعب يكتب إجاباته/تقدّمه فقط، والنتيجة تُحسب عند الطرفين من نفس البذرة، فلا مضيف يقود اللعبة.
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
import { h, icon, avatar, toast, confetti, countUp, hl } from '../ui.js';
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
  async function leave() { if (phase === 'play' || phase === 'read') { if (!confirm(isRead() ? 'إنهاء جلسة القراءة؟' : 'الانسحاب يعني خسارة هذه المباراة. متأكد؟')) return; } cleanup(); if (phase === 'wait' && d && d.a === meP) cancelDuel(id, d.b); app.goto('friends'); }
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
      if (isRead()) updateReadStatus(); else { drawScores(); checkAdvance(); checkEnd(); }
    }
  }

  const label = () => isRead() ? `قراءة معًا · ${d.n / 2} فقرات لكل واحد` : `${d.n} كلمة · من السهل إلى الأصعب`;
  function renderInvite() { setStage(h('div', { class: 'card center big' }, opp ? avatar(opp.a, 84) : null, h('h2', {}, opp ? `${opp.n} يدعوك!` : 'تحدٍّ جديد'), h('p', { class: 'muted' }, label()), isRead() ? h('p', { class: 'muted small' }, 'تقرؤون معًا في المكالمة: لكل واحد فقرة بنفس المستوى.') : h('p', { class: 'muted small' }, 'نبدأ بكلمات سهلة جدًا ثم نتدرّج ببطء، ووقت كافٍ لكل سؤال.'), h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: async e => { e.currentTarget.disabled = true; try { await acceptDuel(id, d.a); } catch (er) { toast('تعذّر القبول', 'bad'); e.target.disabled = false; } } }, 'قبول'), h('button', { class: 'btn ghost grow', onclick: async () => { await declineDuel(id, d.a); app.goto('friends'); } }, 'رفض')))); }
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
    const w = q.w; q._learn.hidden = false; q._learn.append(h('div', { class: 'lw' }, h('b', { dir: 'ltr' }, w.en), h('span', {}, w.ar), h('button', { class: 'icon-btn sm', onclick: () => speak(w.en) }, icon('volume', 16)), w.pos ? h('button', { class: 'icon-btn sm', onclick: () => openForms(w.id) }, icon('clock', 16)) : null), h('p', { class: 'ex', dir: 'ltr', html: hl(w.ex || '') }));
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
  const myPassage = i => plan[2 * i + (d.a === meP ? 0 : 1)], peerPassage = i => plan[2 * i + (d.a === meP ? 1 : 0)];
  const pairs = () => plan.length / 2;
  function startRead() { drawTop(); ri = Math.min(prog(meP), pairs() - 1); showRead(); }
  function showRead() {
    if (ri >= pairs()) return finishRead();
    rd && rd.destroy && rd.destroy(); rdPeer && rdPeer.destroy && rdPeer.destroy(); rdPeer = null;
    const p = myPassage(ri); rd = reader(p);
    const status = h('div', { class: 'rstatus' }, h('i', { class: 'od' }), h('span', {}, 'صديقك يقرأ…'));
    const next = h('button', { class: 'btn primary grow', hidden: true, onclick: () => { ri++; showRead(); } }, ri + 1 >= pairs() ? 'إنهاء الجلسة 🎉' : 'الفقرة التالية');
    const doneBtn = h('button', { class: 'btn primary grow', onclick: () => { readyMe = ri + 1; sendProgress(id, ri + 1).catch(() => toast('تعذّر الإرسال', 'bad')); sfx.ok(); doneBtn.hidden = true; updateReadStatus(); } }, 'أنهيت القراءة');
    const peerBox = h('div', { class: 'peerbox', hidden: true }); const peerBtn = h('button', { class: 'btn ghost grow', hidden: true, onclick: () => { if (!peerBox.hidden) { peerBox.hidden = true; peerBtn.textContent = '👀 فقرة صديقي'; return; } peerBox.hidden = false; peerBtn.textContent = 'إخفاء فقرة صديقي'; if (!rdPeer) { rdPeer = reader(peerPassage(ri)); peerBox.append(h('div', { class: 'tag' }, 'فقرة ' + (opp ? opp.n : 'صديقك')), rdPeer); } } }, '👀 فقرة صديقي');
    const head = h('div', { class: 'row between' }, h('div', { class: 'tag' }, `الفقرة ${ri + 1} من ${pairs()} · المستوى ${p.lv}`), status);
    const tip = h('p', { class: 'muted small tipline' }, '🎧 أنتما في مكالمة: اقرأ فقرتك لوحدك أولًا، ثم اشرحا لبعضكما ما فهمتما.');
    setStage(h('div', { class: 'rview' }, h('div', { class: 'card' }, head, tip, rd), h('div', { class: 'row gap rbtns' }, doneBtn, peerBtn, next), peerBox));
    el._rs = { status, next, doneBtn, peerBtn }; updateReadStatus();
    gsap.fromTo(el.querySelector('.rview'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .4, clearProps: 'all' });
  }
  function updateReadStatus() {
    const r = el._rs; if (!r || !d) return; const mine = readyMe >= ri + 1 || prog(meP) >= ri + 1, theirs = prog(oppP) >= ri + 1;
    r.status.className = 'rstatus' + (theirs ? ' on' : ''); r.status.lastChild.textContent = theirs ? 'صديقك أنهى قراءته ✅' : 'صديقك يقرأ…';
    if (mine && theirs) { r.next.hidden = false; r.peerBtn.hidden = false; if (!r._both) { r._both = true; sfx.win(); toast('أنهيتما القراءة — ناقشا ما فهمتماه 🎧', 'good'); } }
    else if (mine) r.status.lastChild.textContent = 'بانتظار صديقك… (تحدّثا في المكالمة)';
  }
  function finishRead() {
    if (done) return; done = true; cleanup(); phase = 'done'; const n = pairs(); const flagged = Math.max(0, flagCount() - flags0); const xp = n * 15 + flagged * 3; bumpDay(0, 0, xp);
    S.duels.unshift({ id, opp: opp ? opp.n : '؟', av: opp ? opp.a : '🙂', my: n, their: n, res: 'r', t: Date.now(), k: 'r' }); S.duels.length = Math.min(S.duels.length, 20); pushLog({ t: Date.now(), mode: 'duel', n, ok: n, xp, ms: 0 }); saveNow(); save(); finishDuel(id); setTimeout(() => dropDuel(id), 8000);
    const xpEl = h('b', {}, '0');
    setStage(h('div', { class: 'card center big result' }, h('div', { class: 'trophy' }, '📖'), h('h2', {}, 'أنهيتما القراءة معًا!'), h('p', { class: 'muted' }, `قرأت ${n} فقرات وعلّمت ${flagged} كلمة جديدة في دفترك`), h('div', { class: 'stats3' }, h('div', {}, h('b', { dir: 'ltr' }, '+', xpEl), h('small', {}, 'خبرة')), h('div', {}, h('b', {}, n), h('small', {}, 'فقرات')), h('div', {}, h('b', {}, flagged), h('small', {}, 'كلمات جديدة'))),
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: () => app.goto('session/mywords') }, 'تدرّب على كلماتك'), h('button', { class: 'btn ghost grow', onclick: () => app.goto('friends') }, 'رجوع'))));
    countUp(xpEl, xp, 1); sfx.win(); confetti(70);
  }

  unwatch = watchDuel(id, onData);
  setStage(h('div', { class: 'card center big' }, h('div', { class: 'spinner' })));
  return { el, destroy() { cleanup(); try { speechSynthesis.cancel(); } catch (e) {} } };
}
