// المبارزة: كل لاعب يكتب إجاباته فقط، والنتيجة تُحسب عند الطرفين من نفس الأسئلة (بذرة مشتركة). لا مضيف يقود اللعبة.
import { state, save, bumpDay, saveNow } from '../store.js';
import * as SRS from '../srs.js';
import { duelQuestions, duelPoints, TYPES } from '../quiz.js';
import { watchDuel, acceptDuel, declineDuel, cancelDuel, sendAnswer, finishDuel, dropDuel, serverNow, peek, createDuel, myPid } from '../net.js';
import { speak } from '../speech.js';
import { sfx, buzz } from '../sfx.js';
import { DUEL, XP } from '../config.js';
import { h, icon, avatar, toast, confetti, countUp } from '../ui.js';

export function mount({ args, app }) {
  const id = args[0]; const S = state(); const meP = myPid();
  const el = h('section', { class: 'view duel' }); const stage = h('div', { class: 'dstage' });
  const top = h('div', { class: 'dtop' }); el.append(top, stage);
  let d = null, opp = null, oppP = null, qs = null, phase = 'load', qi = -1, locked = false, timer = null, startAt = 0, myAns = {}, done = false, unwatch = null, revealT = null, endTimer = null;

  const parse = v => { if (!v) return null; const [c, ms] = v.split(':'); return { c: +c, ms: +ms }; };
  const ansOf = (p, i) => parse(d && d.ans && d.ans[p] && d.ans[p][i]);
  const score = p => { let s = 0; if (!qs) return 0; qs.forEach((q, i) => { const a = ansOf(p, i); if (a) s += duelPoints(a.c === q.ans, a.ms, DUEL.secs); }); return s; };
  const answered = p => d && d.ans && d.ans[p] ? Object.keys(d.ans[p]).length : 0;

  function drawTop() {
    top.innerHTML = '';
    if (!opp) return;
    top.append(h('button', { class: 'icon-btn', onclick: leave }, icon('x', 22)), h('div', { class: 'vs' },
      h('div', { class: 'pl' }, avatar(S.me.av, 34), h('b', {}, S.me.name), h('span', { class: 'sc', id: 'my' }, score(meP))),
      h('span', { class: 'x' }, '⚔️'),
      h('div', { class: 'pl r' }, h('span', { class: 'sc', id: 'op' }, score(oppP)), h('b', {}, opp.n), avatar(opp.a, 34))));
  }
  const setStage = n => { stage.innerHTML = ''; stage.append(n); gsap.fromTo(n, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power3.out', clearProps: 'all' }); };
  async function leave() { if (phase === 'play') { if (!confirm('الانسحاب يعني خسارة هذه المباراة. متأكد؟')) return; } cleanup(); if (phase === 'wait' && d && d.a === meP) cancelDuel(id, d.b); app.goto('friends'); }
  function cleanup() { clearTimeout(timer); clearTimeout(revealT); clearTimeout(endTimer); unwatch && unwatch(); unwatch = null; }

  function onData(v) {
    d = v;
    if (done) return;
    if (!d) { if (phase === 'load' || phase === 'wait' || phase === 'invite') { phase = 'gone'; setStage(h('div', { class: 'card center' }, h('h2', {}, 'انتهى التحدّي'), h('p', { class: 'muted' }, 'تم إلغاء هذا التحدّي أو حذفه.'), h('button', { class: 'btn primary', onclick: () => app.goto('friends') }, 'رجوع'))); } return; }
    if (!oppP) { oppP = d.a === meP ? d.b : d.a; peek(oppP).then(p => { opp = p || { n: 'لاعب', a: '🙂' }; drawTop(); if (phase === 'invite') renderInvite(); if (phase === 'wait') renderWait(); }); if (meP !== d.a && meP !== d.b) { phase = 'gone'; setStage(h('div', { class: 'card center' }, h('p', {}, 'هذا التحدّي ليس لك.'))); return; } }
    if (!qs) qs = duelQuestions(d.seed, d.n, d.lv);
    if (d.st === 'no') { if (phase !== 'noed') { phase = 'noed'; cleanup(); setStage(h('div', { class: 'card center' }, h('h2', {}, d.a === meP ? 'رفض التحدّي 😕' : 'أُلغي التحدّي'), h('button', { class: 'btn primary', onclick: () => { dropDuel(id); app.goto('friends'); } }, 'رجوع'))); } return; }
    if (d.st === 'invite') { if (d.b === meP && phase !== 'invite') { phase = 'invite'; renderInvite(); } else if (d.a === meP && phase !== 'wait') { phase = 'wait'; renderWait(); } return; }
    if (d.st === 'play' || d.st === 'done') {
      if (phase === 'load' || phase === 'invite' || phase === 'wait') { phase = 'count'; startCountdown(); }
      drawScores(); checkAdvance(); checkEnd();
    }
  }

  function renderInvite() { setStage(h('div', { class: 'card center big' }, opp ? avatar(opp.a, 84) : null, h('h2', {}, opp ? `${opp.n} يتحدّاك!` : 'تحدٍّ جديد'), h('p', { class: 'muted' }, `${d.n} أسئلة · ${DUEL.secs} ثانية للسؤال · الأسرع والأدق يفوز`), h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: async e => { e.currentTarget.disabled = true; try { await acceptDuel(id, d.a); } catch (er) { toast('تعذّر القبول', 'bad'); e.target.disabled = false; } } }, 'قبول التحدّي'), h('button', { class: 'btn ghost grow', onclick: async () => { await declineDuel(id, d.a); app.goto('friends'); } }, 'رفض')))); }
  function renderWait() { setStage(h('div', { class: 'card center big' }, opp ? avatar(opp.a, 84) : null, h('h2', {}, opp ? `بانتظار ${opp.n}…` : 'بانتظار الصديق…'), h('div', { class: 'spinner' }), h('p', { class: 'muted' }, 'وصله إشعار بالتحدّي. ستبدأ المباراة فور قبوله، ويمكنك البقاء هنا أو الرجوع لاحقًا.'), h('button', { class: 'btn ghost', onclick: leave }, 'إلغاء التحدّي'))); }

  function startCountdown() {
    startAt = (d.t0 || serverNow()) + DUEL.countdown; const n = h('div', { class: 'cd' }, '3'); const w = h('div', { class: 'card center big' }, h('h2', {}, 'استعد!'), n); setStage(w); drawTop();
    const tick = () => { const left = Math.ceil((startAt - serverNow()) / 1000); if (left <= 0) { phase = 'play'; return nextQ(); } if (n.textContent != left) { n.textContent = left; sfx.tick(); gsap.fromTo(n, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: .45, ease: 'back.out(2)' }); } timer = setTimeout(tick, 120); };
    tick();
  }

  function nextQ() {
    qi++; if (qi >= d.n) return waitEnd(); locked = false; const q = qs[qi]; const w = q.w; const qStart = performance.now();
    const say = () => speak(w.en);
    const timeEl = h('div', { class: 'tbar' }, h('i')); const opts = h('div', { class: 'opts' });
    let prompt;
    if (q.type === 'mean') prompt = h('div', { class: 'prompt' }, h('div', { class: 'big-word', dir: 'ltr' }, w.en), h('button', { class: 'icon-btn say', onclick: say }, icon('volume', 22)));
    else if (q.type === 'rev') prompt = h('div', { class: 'prompt' }, h('div', { class: 'big-ar' }, w.ar));
    else if (q.type === 'listen') prompt = h('div', { class: 'prompt' }, h('button', { class: 'icon-btn say lg pulse', onclick: say }, icon('volume', 30)));
    else if (q.type === 'cloze') prompt = h('div', { class: 'prompt' }, h('p', { class: 'cloze', dir: 'ltr' }, q.sentence), h('div', { class: 'hint-ar' }, w.ar));
    else prompt = h('div', { class: 'prompt' }, h('p', { class: 'cloze', dir: 'ltr' }, w.def));
    const ltr = q.type !== 'mean';
    q.opts.forEach((t, i) => opts.append(h('button', { class: 'opt', dir: ltr ? 'ltr' : 'rtl', 'data-i': i, onclick: () => pick(i) }, h('kbd', {}, i + 1), h('span', {}, t))));
    const oppDot = h('div', { class: 'oppstat' }, '…خصمك يفكّر');
    const card = h('div', { class: 'card q' }, h('div', { class: 'tag' }, `${qi + 1}/${d.n} · ${TYPES[q.type]}`), prompt, opts, oppDot);
    setStage(h('div', {}, timeEl, card)); drawTop();
    gsap.fromTo(timeEl.firstChild, { width: '100%' }, { width: '0%', duration: DUEL.secs, ease: 'none' });
    if (q.type === 'listen' || q.type === 'mean') setTimeout(say, 350);
    q._qStart = qStart; q._opts = opts; q._opp = oppDot;
    clearTimeout(timer); timer = setTimeout(() => { if (!locked) { locked = true; lock(null); } timeUp(); }, DUEL.secs * 1000 + 200);
    function pick(i) { if (locked) return; locked = true; const ms = performance.now() - qStart; myAns[qi] = { c: i, ms }; sendAnswer(id, qi, i, ms).catch(() => toast('تعذّر إرسال إجابتك', 'bad')); lock(i); const ok = i === q.ans; ok ? sfx.ok() : (sfx.bad(), buzz(50)); checkAdvance(); }
    function lock(i) { [...opts.children].forEach(b => { b.disabled = true; if (i === null) b.classList.add('dim'); else if (+b.dataset.i === i) b.classList.add('sel'); else b.classList.add('dim'); }); }
    function timeUp() { reveal(); }
  }

  function checkAdvance() {
    if (phase !== 'play' || qi < 0 || qi >= d.n) return; const q = qs[qi]; if (!q._opts) return;
    const oa = ansOf(oppP, qi); if (oa && q._opp) q._opp.textContent = '✅ خصمك أجاب';
    if (locked && myAns[qi] && oa && !q._revealed) reveal();
  }
  function reveal() {
    const q = qs[qi]; if (!q || q._revealed || phase !== 'play') return; q._revealed = true; clearTimeout(timer);
    [...q._opts.children].forEach(b => { const i = +b.dataset.i; b.classList.remove('sel', 'dim'); if (i === q.ans) b.classList.add('good'); });
    const my = myAns[qi], oa = ansOf(oppP, qi);
    if (my && my.c !== q.ans) q._opts.children[my.c].classList.add('bad');
    if (oa && q._opp) q._opp.textContent = oa.c === q.ans ? '✅ خصمك أصاب' : '❌ خصمك أخطأ';
    else if (q._opp) q._opp.textContent = '⏱ لم يجب خصمك';
    const my2 = my ? duelPoints(my.c === q.ans, my.ms, DUEL.secs) : 0; document.getElementById('my') && gsap.fromTo('#my', { scale: 1.4 }, { scale: 1, duration: .4 });
    revealT = setTimeout(nextQ, 1700);
  }
  function drawScores() { const a = document.getElementById('my'), b = document.getElementById('op'); if (a) a.textContent = score(meP); if (b) b.textContent = score(oppP); }

  function waitEnd() {
    phase = 'end'; const spin = h('div', { class: 'card center big' }, h('h2', {}, 'انتهت أسئلتك'), h('div', { class: 'spinner' }), h('p', { class: 'muted' }, 'بانتظار إكمال خصمك…')); setStage(spin);
    endTimer = setTimeout(() => finishUp(true), 15000); checkEnd();
  }
  function checkEnd() { if (phase === 'end' && answered(oppP) >= d.n) finishUp(); }

  function finishUp() {
    if (done) return; done = true; cleanup(); phase = 'done';
    const a = score(meP), b = score(oppP); const res = a > b ? 'w' : a < b ? 'l' : 'd'; const gain = res === 'w' ? XP.duelWin : res === 'l' ? XP.duelLose : 25;
    let ok = 0; qs.forEach((q, i) => { const m = ansOf(meP, i); const c = !!m && m.c === q.ans; if (c) ok++; SRS.record(q.id, c); });
    bumpDay(d.n, ok, gain + ok * 2);
    S.duels.unshift({ id, opp: opp ? opp.n : '؟', av: opp ? opp.a : '🙂', my: a, their: b, res, t: Date.now() }); S.duels.length = Math.min(S.duels.length, 20); saveNow(); save();
    finishDuel(id); setTimeout(() => dropDuel(id), 8000);
    const xpEl = h('b', {}, '0');
    setStage(h('div', { class: 'card center big result' }, h('div', { class: 'trophy' }, res === 'w' ? '🏆' : res === 'l' ? '💪' : '🤝'), h('h2', {}, res === 'w' ? 'فزت!' : res === 'l' ? 'خسرت هذه الجولة' : 'تعادل!'),
      h('div', { class: 'vsr' }, h('div', {}, avatar(S.me.av, 52), h('b', {}, a), h('small', {}, S.me.name)), h('span', {}, '–'), h('div', {}, avatar(opp ? opp.a : '🙂', 52), h('b', {}, b), h('small', {}, opp ? opp.n : ''))),
      h('div', { class: 'stats3' }, h('div', {}, h('b', {}, '+', xpEl), h('small', {}, 'خبرة')), h('div', {}, h('b', {}, `${ok}/${d.n}`), h('small', {}, 'إجاباتك الصحيحة'))),
      h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: async e => { e.currentTarget.disabled = true; try { const nid = await createDuel(oppP, d.lv || 0); app.goto('duel/' + nid); } catch (er) { toast('تعذّر إرسال التحدّي', 'bad'); e.target.disabled = false; } } }, 'إعادة التحدّي'), h('button', { class: 'btn ghost grow', onclick: () => app.goto('friends') }, 'رجوع'))));
    countUp(xpEl, gain + ok * 2, 1); if (res === 'w') { sfx.win(); confetti(90); }
  }

  unwatch = watchDuel(id, onData);
  setStage(h('div', { class: 'card center big' }, h('div', { class: 'spinner' })));
  return { el, destroy() { cleanup(); try { speechSynthesis.cancel(); } catch (e) {} } };
}
