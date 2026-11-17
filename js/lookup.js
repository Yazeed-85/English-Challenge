// البحث والترجمة: القاموس الرئيسي + المفردات الأساسية + كلمات المستخدم + (اختياري) ترجمة آلية من الإنترنت.
import { WORDS, BY_ID } from './words.js';
import { BASIC } from './data/basic.js';
import { lemmaCandidates, verbForms, plural, adjForms } from './forms.js';
import { state } from './store.js';

// ---- كلمات المستخدم المضافة (تُسجَّل في BY_ID كي تدخل الأسئلة)
export function registerCustom() {
  const S = state();
  for (const [id, f] of Object.entries(S.flags || {})) {
    if (BY_ID[id] && !BY_ID[id].custom) continue;
    BY_ID[id] = { id, en: f.en || id, pos: f.pos || '', ar: f.ar || '؟', def: '', ex: f.ex || '', lvl: 0, topic: 'custom', custom: true };
  }
}
export function addCustom(id, f) { const S = state(); S.flags[id] = Object.assign({ s: 'l', t: Date.now() }, f); registerCustom(); }

export const entryOf = lemma => BY_ID[lemma] || BASIC[lemma] || null;

// نتيجة تحليل كلمة من نص: { token, lemma, entry, builtin }
export function resolve(token) {
  const cands = lemmaCandidates(token);
  for (const c of cands) { const e = BY_ID[c] || BASIC[c]; if (e) return { token, lemma: c, entry: e, builtin: !!BY_ID[c] && !BY_ID[c].custom, form: c !== cands[0] }; }
  return { token, lemma: cands[0] || token.toLowerCase(), entry: null, builtin: false };
}

// ---- مفتاح البحث العربي: يهمل التشكيل والبادئات وحروف العلّة فيتطابق "قبول" مع "يقبل"
export function arKey(s) {
  s = (s || '').replace(/[ً-ْـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  s = s.replace(/^ال/, '').replace(/^[لبكف]ال/, '');
  s = s.replace(/[اويء]/g, '');
  return s;
}
// مفاتيح مقارنة: الجذر التقريبي، ومعه نسخة بلا حرف المضارعة الأول (ت/ن/أ/م)
export function arKeys(s) { const k = arKey(s); if (!k) return []; const o = [k]; if (k.length >= 4 && 'تنام'.includes(k[0])) o.push(k.slice(1)); return o; }
const arWords = s => (s || '').replace(/[()\/،,؟]/g, ' ').split(/\s+/).filter(Boolean);
let formIndex = null;
function forms() { // كل الصيغ المصرَّفة للكلمات → الكلمة
  if (formIndex) return formIndex; formIndex = {};
  for (const w of WORDS) {
    const add = f => { if (f && !formIndex[f]) formIndex[f] = w.id; };
    if (w.pos === 'v') { const f = verbForms(w.id); [f.third, f.past, f.pp, f.ing].forEach(add); }
    else if (w.pos === 'n') add(plural(w.id));
    else if (w.pos === 'adj') { const a = adjForms(w.id); [a.comp, a.sup].forEach(x => add(x.replace('more ', '').replace('most ', ''))); }
  }
  return formIndex;
}
export function searchDict(q, list = WORDS) {
  q = q.trim(); if (!q) return list;
  if (/[؀-ۿ]/.test(q)) {
    const ks = arKeys(q); if (!ks.length) return list.filter(w => w.ar.includes(q));
    return list.filter(w => w.ar.includes(q) || arWords(w.ar).some(x => { const as = arKeys(x); return as.some(a => ks.some(k => a === k || (k.length >= 2 && a.length >= 2 && (a.startsWith(k) || k.startsWith(a))))); }));
  }
  const l = q.toLowerCase(); const fi = forms();
  return list.filter(w => w.en.toLowerCase().includes(l) || fi[l] === w.id || (w.def && w.def.toLowerCase().includes(l) && l.length > 3));
}

// ---- ترجمة آلية احتياطية (MyMemory) مع تخزين مؤقت. قد تفشل بلا إنترنت، ولا يُعتمد عليها.
const CK = 'ec2.tr';
export async function onlineTranslate(word) {
  let cache = {}; try { cache = JSON.parse(localStorage.getItem(CK) || '{}'); } catch (e) {}
  if (cache[word]) return cache[word];
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ar`, { signal: ctl.signal }); clearTimeout(t);
    const j = await r.json(); let ar = j && j.responseData && j.responseData.translatedText;
    if (!ar || /MYMEMORY|INVALID|QUERY LENGTH/i.test(ar) || ar.toLowerCase() === word.toLowerCase()) return null;
    cache[word] = ar; try { localStorage.setItem(CK, JSON.stringify(cache)); } catch (e) {}
    return ar;
  } catch (e) { return null; }
}
