// المخزن المحلي: كل تقدّم المستخدم هنا أولًا (يعمل بلا إنترنت)، ثم يُنسخ للسحابة في الخلفية.
const KEY = 'ec2.state';
const blank = () => ({
  v: 1, me: null, cards: {}, notes: {}, stars: {}, log: [], days: {}, xp: 0, streak: { n: 0, best: 0, last: '' },
  settings: { sound: true, rate: 0.85, goal: 20, level: 1 }, duels: [], totals: { sessions: 0, q: 0, ok: 0 }, pendingJoin: null, pubXp: 0
});
let S = blank();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) {}
S.settings = Object.assign(blank().settings, S.settings);

const subs = new Set(); let timer = null;
export const state = () => S;
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 150);
  subs.forEach(fn => { try { fn(S); } catch (e) {} });
}
export const saveNow = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
export function replaceAll(next) { S = Object.assign(blank(), next); S.settings = Object.assign(blank().settings, S.settings); saveNow(); subs.forEach(fn => fn(S)); }

// ---- تواريخ بتوقيت الجهاز
const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayNum = (d = new Date()) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
export const lastDays = n => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d; });

// ---- مستوى الخبرة
const thresholds = lv => 50 * lv * (lv - 1) + 0; // XP للوصول إلى lv (lv=1→0, lv=2→100, lv=3→300…)
export function levelInfo(xp) {
  let lv = 1; while (xp >= thresholds(lv + 1)) lv++;
  const a = thresholds(lv), b = thresholds(lv + 1);
  return { lv, into: xp - a, need: b - a, pct: (xp - a) / (b - a) };
}

// ---- تسجيل النشاط (الخبرة والسلسلة وأيام النشاط)
export function bumpDay(q, ok, xp) {
  const k = dayKey(); const d = S.days[k] || (S.days[k] = { q: 0, ok: 0, xp: 0 });
  const first = d.q === 0 && q > 0;
  d.q += q; d.ok += ok; d.xp += xp; S.xp += xp;
  if (q > 0) {
    const yest = dayKey(new Date(Date.now() - 864e5));
    if (S.streak.last !== k) { S.streak.n = S.streak.last === yest ? S.streak.n + 1 : 1; S.streak.last = k; S.streak.best = Math.max(S.streak.best, S.streak.n); }
  }
  // نحتفظ بآخر 60 يومًا فقط
  const keys = Object.keys(S.days).sort(); while (keys.length > 60) delete S.days[keys.shift()];
  save(); return first;
}
export const streakNow = () => { const k = dayKey(), y = dayKey(new Date(Date.now() - 864e5)); return (S.streak.last === k || S.streak.last === y) ? S.streak.n : 0; };
export const today = () => S.days[dayKey()] || { q: 0, ok: 0, xp: 0 };
export function pushLog(e) { S.log.unshift(e); S.log.length = Math.min(S.log.length, 40); S.totals.sessions++; save(); }
