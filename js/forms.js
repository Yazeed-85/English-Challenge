// التصاريف والأزمنة وتحويل الكلمة المصرَّفة إلى أصلها (lemma). قواعد الإنجليزية + جداول الشواذ.
import { IRR_VERBS, IRR_PLURALS, IRR_ADJ, DOUBLE, UNCOUNT, SHORT_ER, NO_ADV } from './data/irregular.js';
const V = /[aeiou]/, isV = c => V.test(c);
const endsCVC = w => w.length >= 3 && !isV(w[w.length - 1]) && !'wxy'.includes(w[w.length - 1]) && isV(w[w.length - 2]) && !isV(w[w.length - 3]);
const dbl = w => DOUBLE.has(w) && endsCVC(w) ? w + w[w.length - 1] : w;

export function thirdPerson(w) {
  if (w === 'be') return 'is'; if (w === 'have') return 'has'; if (w === 'do') return 'does'; if (w === 'go') return 'goes';
  if (/(s|sh|ch|x|z|o)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}
export function ingForm(w) {
  if (w === 'be') return 'being'; if (w === 'die') return 'dying'; if (w === 'lie') return 'lying';
  if (/ie$/.test(w)) return w.slice(0, -2) + 'ying';
  if (/[^aeiouy]e$/.test(w) && !/(ee|ye|oe)$/.test(w)) return w.slice(0, -1) + 'ing';
  return dbl(w) + 'ing';
}
export function pastRegular(w) {
  if (/e$/.test(w)) return w + 'd';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ied';
  return dbl(w) + 'ed';
}
export function verbForms(w) {
  const irr = IRR_VERBS[w]; const past = irr ? irr[0] : pastRegular(w), pp = irr ? irr[1] : pastRegular(w);
  return { base: w, third: thirdPerson(w), past, pp, ing: ingForm(w), irregular: !!irr };
}
export function plural(w) {
  if (IRR_PLURALS[w]) return IRR_PLURALS[w];
  if (/(s|x|z|ch|sh)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/(?:[^aeiou]o)$/.test(w) && ['hero', 'potato', 'tomato'].includes(w)) return w + 'es';
  return w + 's';
}
export function adjForms(w) {
  if (IRR_ADJ[w]) return { comp: IRR_ADJ[w][0], sup: IRR_ADJ[w][1], irregular: true };
  if (SHORT_ER.has(w)) {
    let b = w; if (/[^aeiou]y$/.test(b)) b = b.slice(0, -1) + 'i'; else if (/e$/.test(b)) b = b.slice(0, -1); else b = dbl(b);
    return { comp: b + 'er', sup: b + 'est' };
  }
  return { comp: 'more ' + w, sup: 'most ' + w };
}
export function adverbOf(w) {
  if (NO_ADV.has(w)) return null;
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ily';
  if (/le$/.test(w)) return w.slice(0, -1) + 'y';
  if (/ic$/.test(w)) return w + 'ally';
  if (/ful$/.test(w) || /[^l]l$/.test(w) || true) return w + 'ly';
}

// جدول عرض: يُرجع أقسامًا [{title, rows:[[label, value]]}] حسب نوع الكلمة
export function table(en, pos) {
  const w = en.toLowerCase();
  if (pos === 'v') {
    const f = verbForms(w); const be = w === 'be';
    const sub = (a, b) => `${a} ${b}`;
    return [
      { title: 'أشكال الفعل', rows: [['المصدر (Base)', f.base], ['المفرد الغائب (he/she/it)', f.third], ['الماضي البسيط', f.past + (f.irregular ? ' ⚠️ شاذ' : '')], ['اسم المفعول (Past Participle)', f.pp], ['الفعل + ing', f.ing]] },
      { title: 'الأزمنة', rows: be ? [['المضارع', 'I am · you/we/they are · he/she/it is'], ['الماضي', 'I/he/she/it was · you/we/they were'], ['المستقبل', 'will be'], ['التام', 'have/has been']] : [
        ['المضارع البسيط', `I/you/we/they ${f.base} · he/she/it ${f.third}`],
        ['المضارع المستمر', `am/is/are ${f.ing}`],
        ['الماضي البسيط', `${f.past}`],
        ['الماضي المستمر', `was/were ${f.ing}`],
        ['المضارع التام', `have/has ${f.pp}`],
        ['الماضي التام', `had ${f.pp}`],
        ['المستقبل', `will ${f.base}`],
        ['النفي (مضارع)', `don't/doesn't ${f.base}`],
        ['النفي (ماضي)', `didn't ${f.base}`],
        ['الأمر', f.base + '!']] }
    ];
  }
  if (pos === 'n') {
    const unc = UNCOUNT.has(w);
    return [{ title: 'الاسم', rows: [['المفرد', w], ['الجمع', unc ? 'غير معدود غالبًا (لا جمع له)' : plural(w)], ['مع الملكية', `${w}'s`]] }];
  }
  if (pos === 'adj') {
    const a = adjForms(w); const adv = adverbOf(w);
    const rows = [['الصفة', w], ['المقارنة (أكثر)', a.comp + (a.irregular ? ' ⚠️ شاذ' : '')], ['التفضيل (الأكثر)', 'the ' + a.sup]];
    if (adv) rows.push(['الحال (adverb)', adv]);
    return [{ title: 'الصفة', rows }];
  }
  return [];
}

// ------ تحويل الكلمة المصرَّفة إلى أصلها
export function lemmaCandidates(tok) {
  let t = tok.toLowerCase().replace(/['’]s$/, '').replace(/[^a-z]/g, ''); if (!t) return [];
  const out = [t];
  const PRES = { am: 'be', is: 'be', are: 'be', 'being': 'be', has: 'have', having: 'have', does: 'do', doing: 'do', goes: 'go', 'cannot': 'can' }; if (PRES[t]) out.push(PRES[t]);
  for (const [b, [p, pp]] of Object.entries(IRR_VERBS)) { if (p.split('/').includes(t) || pp === t) out.push(b); }
  for (const [s, p] of Object.entries(IRR_PLURALS)) if (p === t) out.push(s);
  for (const [b, [c, s]] of Object.entries(IRR_ADJ)) if (c === t || s === t) out.push(b);
  if (t.endsWith('ies')) out.push(t.slice(0, -3) + 'y');
  if (t.endsWith('es')) out.push(t.slice(0, -2));
  if (t.endsWith('s')) out.push(t.slice(0, -1));
  if (t.endsWith('ied')) out.push(t.slice(0, -3) + 'y');
  if (t.endsWith('ed')) { out.push(t.slice(0, -2), t.slice(0, -1)); const s = t.slice(0, -2); if (/(.)\1$/.test(s)) out.push(s.slice(0, -1)); }
  if (t.endsWith('ing')) { const s = t.slice(0, -3); out.push(s, s + 'e'); if (/(.)\1$/.test(s)) out.push(s.slice(0, -1)); if (t.endsWith('ying')) out.push(s.slice(0, -1) + 'ie'); }
  if (t.endsWith('ier')) out.push(t.slice(0, -3) + 'y'); if (t.endsWith('iest')) out.push(t.slice(0, -4) + 'y');
  if (t.endsWith('er')) { const s = t.slice(0, -2); out.push(s, s + 'e'); if (/(.)\1$/.test(s)) out.push(s.slice(0, -1)); }
  if (t.endsWith('est')) { const s = t.slice(0, -3); out.push(s, s + 'e'); if (/(.)\1$/.test(s)) out.push(s.slice(0, -1)); }
  if (t.endsWith('ily')) out.push(t.slice(0, -3) + 'y'); if (t.endsWith('ly')) out.push(t.slice(0, -2), t.slice(0, -2) + 'le');
  return [...new Set(out)];
}
