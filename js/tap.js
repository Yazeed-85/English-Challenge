// عناصر موحَّدة للتعلّم في كل مكان: جملة قابلة للضغط على كل كلمة (معنى + تصاريف + نطق + إضافة لدفتري)، وصفّ استماع للكلمة أو الجملة.
import { h, icon } from './ui.js';
import { resolve } from './lookup.js';
import { paintFlags } from './flag.js';
import { speak } from './speech.js';
import { openToken } from './reader.js';

const TOK = /([A-Za-z]+(?:['’][A-Za-z]+)?)|([^A-Za-z]+)/g;
export const plain = s => (s || '').replace(/[{}]/g, '');

// جملة إنجليزية: كل كلمة قابلة للنقر. الكلمة المحاطة بـ {} تُبرز بالذهبي.
export function tapSentence(sentence, { cls = 'ex' } = {}) {
  const txt = plain(sentence); const p = h('p', { class: cls + ' tapsent', dir: 'ltr' });
  const parts = (sentence || '').split(/(\{[^}]+\})/);
  for (const part of parts) {
    const hit = /^\{([^}]+)\}$/.exec(part); const s = hit ? hit[1] : part;
    for (const m of s.matchAll(TOK)) {
      if (m[1]) { const r = resolve(m[1]); p.append(h('span', { class: 'w' + (hit ? ' hl' : ''), 'data-t': m[1], 'data-l': r.lemma }, m[1])); }
      else p.append(m[2]);
    }
  }
  p.addEventListener('click', e => { const w = e.target.closest('.w'); if (w) openToken(w.dataset.t, txt, w); });
  paintFlags(p);
  const f = () => paintFlags(p); window.addEventListener('flags:changed', f);
  const mo = new MutationObserver(() => { if (!p.isConnected && p._seen) { window.removeEventListener('flags:changed', f); mo.disconnect(); } else if (p.isConnected) p._seen = true; });
  mo.observe(document.body, { childList: true, subtree: true });
  return p;
}

// صفّ الاستماع الموحّد: الكلمة، ثم الجملة كاملة
export function sayRow(word, sentence, { small = true } = {}) {
  const row = h('div', { class: 'sayrow' }, h('button', { class: 'btn ghost sm', onclick: () => speak(word) }, icon('volume', 16), ' الكلمة'));
  if (sentence) row.append(h('button', { class: 'btn ghost sm', onclick: () => speak(plain(sentence), false) }, icon('volume', 16), ' الجملة'));
  return row;
}
