// أدوات الواجهة: إنشاء العناصر، الأيقونات، النوافذ السفلية، الحركات (GSAP).
export const h = (tag, props, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const hl = s => esc(s).replace(/\{([^}]+)\}/g, '<b class="hl">$1</b>');

const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flame: '<path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" fill="currentColor"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  ear: '<path d="M6 15a6 6 0 1 1 11.5-2.3c-.7 2-3 2.8-3.5 5a3 3 0 0 1-5.5 1"/><path d="M10 12a2 2 0 1 1 3 1.7"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 4 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 4 3 3 0 0 1-6 1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  send: '<path d="M21 3L3 11l7 3 3 7z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  sword: '<path d="M14 4l6-1-1 6-9 9-3-1-1-3z"/><path d="M5 15l4 4M4 20l3-3"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 11h6M9 15h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 14v4M8 20h8"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'
};
export const icon = (n, size = 22, cls = '') => { const s = h('span', { class: 'ico ' + cls, html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>` }); return s; };

export const avatar = (av, size = 44) => h('span', { class: 'avatar', style: { width: size + 'px', height: size + 'px', fontSize: size * 0.52 + 'px' } }, av || '🙂');

// ---------- toast
export function toast(msg, kind = '') {
  let box = $('#toasts'); if (!box) { box = h('div', { id: 'toasts' }); document.body.append(box); }
  const t = h('div', { class: 'toast ' + kind }, msg); box.append(t);
  gsap.fromTo(t, { y: -20, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: .35, ease: 'back.out(1.6)' });
  setTimeout(() => gsap.to(t, { y: -14, opacity: 0, duration: .25, onComplete: () => t.remove() }), 2600);
}

// ---------- النافذة السفلية
export function sheet(content, { title = '', onClose } = {}) {
  const back = h('div', { class: 'backdrop' });
  const body = h('div', { class: 'sheet-body' }, content);
  const box = h('div', { class: 'sheet', role: 'dialog' }, h('div', { class: 'grab' }), title && h('div', { class: 'sheet-title' }, title), body);
  document.body.append(back, box);
  gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: .25 });
  gsap.fromTo(box, { yPercent: 100 }, { yPercent: 0, duration: .42, ease: 'power3.out' });
  let closed = false;
  const close = () => { if (closed) return; closed = true; gsap.to(back, { opacity: 0, duration: .2 }); gsap.to(box, { yPercent: 100, duration: .3, ease: 'power2.in', onComplete: () => { back.remove(); box.remove(); onClose && onClose(); } }); };
  back.addEventListener('click', close);
  const esc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } }; document.addEventListener('keydown', esc);
  return { close, el: box, body };
}
export const confirmBox = (msg, ok = 'تأكيد', danger = false) => new Promise(res => {
  let done = false; const fin = v => { if (done) return; done = true; s.close(); res(v); };
  const s = sheet(h('div', { class: 'confirm' }, h('p', {}, msg), h('div', { class: 'row' }, h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => fin(true) }, ok), h('button', { class: 'btn ghost', onclick: () => fin(false) }, 'إلغاء'))), { onClose: () => fin(false) });
});

// ---------- حلقة التقدّم
export function ring(pct, { size = 120, stroke = 12, color = 'var(--ok)', track = 'rgba(255,255,255,.08)', inner = null } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const wrap = h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } });
  wrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  if (inner) wrap.append(h('div', { class: 'ring-in' }, inner));
  const arc = wrap.querySelector('.arc');
  wrap.set = (p, d = 1.1) => gsap.to(arc, { strokeDashoffset: c * (1 - Math.max(0, Math.min(1, p))), duration: d, ease: 'power3.out' });
  wrap.set(pct);
  return wrap;
}
export const countUp = (el, to, dur = 1, from = 0, fmt = v => Math.round(v)) => { const o = { v: from }; gsap.to(o, { v: to, duration: dur, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } }); };

export function confetti(n = 70, origin = { x: innerWidth / 2, y: innerHeight * .35 }) {
  const cols = ['#ff7a59', '#2ec4a6', '#ffc65c', '#ff5d7a', '#59b4f2', '#f4a6c0'];
  const layer = h('div', { class: 'confetti' }); document.body.append(layer);
  for (let i = 0; i < n; i++) {
    const p = h('i', { style: { background: cols[i % cols.length], left: origin.x + 'px', top: origin.y + 'px', width: 6 + Math.random() * 6 + 'px', height: 8 + Math.random() * 8 + 'px' } }); layer.append(p);
    gsap.to(p, { x: (Math.random() - .5) * 420, y: 160 + Math.random() * 380, rotation: Math.random() * 720 - 360, opacity: 0, duration: 1.4 + Math.random() * 1.1, ease: 'power2.out', delay: Math.random() * .12 });
  }
  setTimeout(() => layer.remove(), 3000);
}
export const ago = ts => { const s = (Date.now() - ts) / 1000; if (s < 60) return 'الآن'; if (s < 3600) return `قبل ${Math.floor(s / 60)} د`; if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`; return `قبل ${Math.floor(s / 86400)} يوم`; };
export const copyText = async t => { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const a = h('textarea', { style: { position: 'fixed', opacity: 0 } }); a.value = t; document.body.append(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} a.remove(); return ok; } };
export const stagger = (els, o = {}) => gsap.from(els, Object.assign({ y: 22, opacity: 0, duration: .55, ease: 'power3.out', stagger: .06, clearProps: 'transform,opacity' }, o));
