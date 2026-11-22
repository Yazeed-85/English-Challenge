// قارئ الفقرات: استماع، ترجمة، النقر على أي كلمة، السحب إلى «دفتري»، وتلوين الكلمات المعلَّمة.
import { state, save } from './store.js';
import { resolve, onlineTranslate } from './lookup.js';
import { speak, canSpeak } from './speech.js';
import { BY_ID, POS_AR } from './words.js';
import { h, icon, sheet, toast } from './ui.js';
import { flagWord, unflag, flagOf, paintFlags } from './flag.js';
import { formsView } from './views/wordsheet.js';
import { sfx } from './sfx.js';

const TOK = /([A-Za-z]+(?:['’][A-Za-z]+)?)|([^A-Za-z]+)/g;

// نافذة الكلمة المنقورة (أي كلمة داخل الفقرة)
export function openToken(token, sentence, fromEl) {
  const r = resolve(token); const lemma = r.lemma; const e = r.entry; const S = state();
  let ar = e ? e.ar : '', pos = e ? e.pos : '';
  const meaning = h('div', { class: 'ar-mean' }, ar || h('span', { class: 'muted' }, 'جارٍ البحث عن المعنى…'));
  const manual = h('input', { class: 'inp', placeholder: 'اكتب المعنى بنفسك (مثال: يقبل)', hidden: true });
  const flagBtn = h('button', { class: 'btn primary grow', onclick: () => {
    const m = (manual.value || '').trim() || ar; if (!m) { toast('اكتب المعنى أولًا', 'bad'); manual.hidden = false; manual.focus(); return; }
    flagWord({ id: lemma, en: e && e.en ? e.en : lemma, ar: m, pos: pos === 'name' ? '' : pos, sentence, token }, fromEl); s.close();
  } }, '🟡 أضفها إلى دفتري');
  const isFl = flagOf(lemma) && flagOf(lemma).s === 'l';
  const unBtn = h('button', { class: 'btn ghost grow', onclick: () => { unflag(lemma); s.close(); } }, 'إزالة من دفتري');
  const knownBtn = h('button', { class: 'btn ghost sm', onclick: () => { if (BY_ID[lemma] && !BY_ID[lemma].custom) { const c = S.cards[lemma] || (S.cards[lemma] = { b: 0, d: 0, s: 0, w: 0 }); c.b = Math.max(c.b, 3); c.d = Math.floor(Date.now() / 864e5) + 7; save(); } if (isFl) unflag(lemma); toast('تمام، سنعتبرها معروفة ✅'); s.close(); } }, '✅ أعرفها');
  const note = h('textarea', { class: 'note', rows: 2, maxlength: 280, placeholder: 'ملاحظة على الكلمة…' }); note.value = S.notes[lemma] || '';
  let t; note.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const v = note.value.trim(); if (v) S.notes[lemma] = v; else delete S.notes[lemma]; save(); }, 500); });
  const forms = h('div', { class: 'collapse', hidden: true });
  const fBtn = (pos === 'v' || pos === 'n' || pos === 'adj') ? h('button', { class: 'btn ghost sm', onclick: () => { forms.hidden = !forms.hidden; if (!forms.childNodes.length) forms.append(formsView(lemma, pos)); } }, icon('clock', 16), ' التصاريف') : null;
  const body = h('div', { class: 'wsheet' },
    h('div', { class: 'wtop' }, h('div', {}, h('div', { class: 'big-word', dir: 'ltr' }, token), h('div', { class: 'muted', dir: 'rtl' }, r.form || lemma !== token.toLowerCase() ? `الأصل: ${lemma}${pos ? ' · ' + (POS_AR[pos] || '') : ''}` : POS_AR[pos] || '')), h('button', { class: 'icon-btn say', onclick: () => speak(token) }, icon('volume', 22))),
    meaning, manual,
    h('p', { class: 'ex', dir: 'ltr' }, sentence),
    h('div', { class: 'row gap wrap' }, fBtn, knownBtn, h('button', { class: 'btn ghost sm', onclick: () => speak(sentence) }, icon('volume', 16), ' الجملة')),
    forms, note,
    h('div', { class: 'row gap' }, isFl ? unBtn : flagBtn));
  const s = sheet(body); speak(token);
  if (!ar) onlineTranslate(token.toLowerCase()).then(tr => { if (tr) { ar = tr; meaning.textContent = tr + ' (ترجمة آلية — راجعها)'; manual.hidden = false; manual.value = tr; } else { meaning.textContent = 'لا معنى جاهز لهذه الكلمة'; manual.hidden = false; manual.focus(); } });
  return s;
}

export function reader(passage, { onCursor } = {}) {
  const S = state(); let speaking = false, slow = false, cancel = false, showTr = false, curI = -1;
  // نص متّصل: كل جملة span داخل فقرة واحدة، والترجمة فقرة عربية متّصلة تحتها
  const sents = passage.en.map((sent, i) => {
    const sp = h('span', { class: 'sent', dir: 'ltr', 'data-i': i });
    for (const m of sent.matchAll(TOK)) {
      if (m[1]) { const r = resolve(m[1]); sp.append(h('span', { class: 'w', 'data-t': m[1], 'data-l': r.lemma, 'data-s': i }, m[1])); }
      else sp.append(m[2]);
    }
    return sp;
  });
  const para = h('p', { class: 'para', dir: 'ltr' });
  sents.forEach((s, i) => { para.append(s); if (i < sents.length - 1) para.append(' '); });
  const trSents = passage.ar.map((t, i) => h('span', { class: 'tsent', 'data-i': i }, t + ' '));
  const trBox = h('div', { class: 'trbox', hidden: true }, h('div', { class: 'trin' }, h('p', { class: 'para ar', dir: 'rtl' }, trSents)));
  const text = h('div', { class: 'ptext' }, para);
  const mark = (i, cls) => { sents.forEach((s, k) => s.classList.toggle(cls, k === i)); trSents.forEach((s, k) => s.classList.toggle(cls, k === i)); };
  // مؤشّر القراءة الحيّ: يظهر عند الطرفين، ويتحرك بسلاسة
  function setCursor(i, remote) {
    if (i === curI || i < 0 || i >= sents.length) return; curI = i; mark(i, 'cur');
    const s = sents[i]; gsap.fromTo(s, { backgroundColor: 'rgba(255,198,92,.55)' }, { backgroundColor: 'rgba(255,198,92,.16)', duration: .9, ease: 'power2.out' });
    if (remote) { const r = s.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight - 90) s.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    else onCursor && onCursor(i);
  }
  const listenBtn = h('button', { class: 'btn ghost sm', onclick: () => speaking ? stop() : play() }, icon('volume', 18), h('span', {}, ' استمع للفقرة'));
  const slowBtn = h('button', { class: 'chip sm', onclick: e => { slow = !slow; e.currentTarget.classList.toggle('on', slow); } }, '🐢 بطيء');
  const trBtn = h('button', { class: 'btn ghost sm', onclick: () => toggleTr() }, icon('book', 18), h('span', {}, ' إظهار الترجمة'));
  function toggleTr(v) {
    showTr = v === undefined ? !showTr : v; trBtn.lastChild.textContent = showTr ? ' إخفاء الترجمة' : ' إظهار الترجمة'; gsap.killTweensOf(trBox);
    if (showTr) { trBox.hidden = false; gsap.fromTo(trBox, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .45, ease: 'power3.out' }); gsap.from(trSents, { opacity: 0, y: 6, duration: .35, stagger: .07, delay: .1 }); }
    else gsap.to(trBox, { height: 0, opacity: 0, duration: .3, ease: 'power2.in', onComplete: () => { trBox.hidden = true; } });
  }
  function stop() { cancel = true; speaking = false; try { speechSynthesis.cancel(); } catch (e) {} listenBtn.lastChild.textContent = ' استمع للفقرة'; mark(-1, 'speaking'); }
  async function play() {
    if (!canSpeak) { toast('جهازك لا يدعم النطق', 'bad'); return; }
    speaking = true; cancel = false; listenBtn.lastChild.textContent = ' إيقاف';
    for (let i = 0; i < passage.en.length && !cancel; i++) {
      mark(i, 'speaking'); setCursor(i);
      await new Promise(res => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(passage.en[i]); u.lang = 'en-US'; u.rate = slow ? .6 : S.settings.rate; u.onend = res; u.onerror = res; speechSynthesis.speak(u); setTimeout(res, 20000); } catch (e) { res(); } });
    }
    stop();
  }
  // نقر على جملة (خارج الكلمات) = «أنا هنا»
  para.addEventListener('click', e => { const s = e.target.closest('.sent'); if (s && !e.target.closest('.w')) setCursor(+s.dataset.i); });
  const el = h('div', { class: 'reader' }, h('div', { class: 'rhead' }, h('div', { class: 'tag' }, passage.titleAr), h('h2', { dir: 'ltr' }, passage.title)), h('div', { class: 'rtools' }, listenBtn, slowBtn, trBtn), text, trBox,
    h('p', { class: 'muted small hint' }, '👆 اضغط أي كلمة لمعناها وإضافتها لدفترك · أو اضغط مطوّلًا واسحبها إلى «دفتري»'));
  paintFlags(el);

  // نقر / ضغط مطوّل + سحب
  let drag = null, timer = null, sx = 0, sy = 0, down = null, moved = false;
  const zone = h('div', { class: 'dropzone', hidden: true }, icon('book', 26), h('b', {}, 'أفلتها هنا لإضافتها إلى دفتري'));
  el.append(zone);
  const sentenceOf = w => passage.en[+w.dataset.s];
  const hit = (x, y) => { const r = zone.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; };
  text.addEventListener('pointerdown', e => {
    const w = e.target.closest('.w'); if (!w) return; down = w; moved = false; sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => { // بدء السحب
      drag = h('div', { class: 'dragchip' }, w.dataset.t); document.body.append(drag); zone.hidden = false; zone.classList.add('show'); gsap.fromTo(zone, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: .3 });
      gsap.set(drag, { x: sx, y: sy - 40, xPercent: -50, yPercent: -50 }); w.classList.add('lift'); sfx.pop(); try { navigator.vibrate && navigator.vibrate(15); } catch (er) {}
    }, 380);
  });
  const mv = e => {
    if (!down) return;
    if (!drag) { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 9) { moved = true; clearTimeout(timer); } return; }
    gsap.to(drag, { x: e.clientX, y: e.clientY - 40, duration: .08 }); zone.classList.toggle('hot', hit(e.clientX, e.clientY));
  };
  const tm = e => { if (drag) e.preventDefault(); };
  window.addEventListener('pointermove', mv); window.addEventListener('touchmove', tm, { passive: false });
  const end = e => {
    clearTimeout(timer); if (!down) return; const w = down; down = null;
    if (drag) {
      const ok = hit(e.clientX, e.clientY); const ghost = drag; drag = null; w.classList.remove('lift');
      const fin = () => { ghost.remove(); gsap.to(zone, { y: 80, opacity: 0, duration: .25, onComplete: () => { zone.hidden = true; zone.classList.remove('hot', 'show'); } }); };
      if (ok) { const tok = w.dataset.t, r = resolve(tok);
        if (r.entry && r.entry.pos !== 'name') { flagWord({ id: r.lemma, en: r.entry.en || r.lemma, ar: r.entry.ar, pos: r.entry.pos, sentence: sentenceOf(w), token: tok }, ghost); ghost.style.opacity = 0; fin(); }
        else { fin(); openToken(tok, sentenceOf(w), w); } }
      else { gsap.to(ghost, { x: sx, y: sy, opacity: 0, duration: .3, onComplete: fin }); }
      return;
    }
    if (!moved && e.type === 'pointerup') openToken(w.dataset.t, sentenceOf(w), w);
  };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  text.addEventListener('contextmenu', e => { if (e.target.closest('.w')) e.preventDefault(); });
  const onFlags = () => paintFlags(el); window.addEventListener('flags:changed', onFlags);
  el.destroy = () => { stop(); window.removeEventListener('flags:changed', onFlags); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); window.removeEventListener('pointermove', mv); window.removeEventListener('touchmove', tm); drag && drag.remove(); };
  el.toggleTr = toggleTr; el.setCursor = setCursor; el.cursor = () => curI;
  return el;
}
