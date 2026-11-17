// الهوية: معرّف عام (pid) + رمز استعادة (key) + رمز دعوة (inv). المعرّف مربوط بحساب Firebase المجهول عبر link/{uid}.
// التسجيل في السحابة يتم في الخلفية؛ المستخدم يبدأ التعلّم فورًا حتى بلا إنترنت.
import { db, ref, get, set, update, remove, serverTimestamp, ready, withTimeout, onValue, onDisconnect } from './firebase.js';
import { state, save, saveNow, replaceAll } from './store.js';
import { levelInfo } from './store.js';
import { counts } from './srs.js';

const A = 'abcdefghjkmnpqrstuvwxyz23456789';
export const rid = (n = 12) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, x => A[x % A.length]).join(''); };

export const cloud = { ok: false, uid: null, err: null };
const listeners = new Set(); export const onCloud = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(f => { try { f(cloud); } catch (e) {} });
export const me = () => state().me;

// ينشئ ملفًا محليًا فورًا (قبل أي اتصال)
export function createLocalProfile({ name, av, level, goal }) {
  const S = state();
  S.me = { pid: rid(), key: rid(), inv: rid(16), name, av, created: Date.now(), u: null };
  S.settings.level = level; S.settings.goal = goal;
  saveNow(); return S.me;
}

// يربط الجهاز بالسحابة: ينشئ link/keys/pub/inv إن لم تكن موجودة، أو يستعيد إن كان الحساب المجهول مرتبطًا بمعرّف آخر.
export async function connect() {
  try {
    const user = await withTimeout(ready, 8000); cloud.uid = user.uid;
    const S = state(); const m = S.me;
    const lk = await withTimeout(get(ref(db, 'link/' + user.uid)), 8000);
    if (!m) { if (!lk.exists()) { cloud.ok = true; emit(); return null; } await adopt(lk.val()); cloud.ok = true; cloud.verified = true; emit(); return lk.val(); }
    if (m.u === user.uid && cloud.verified) { cloud.ok = true; emit(); return m.pid; }
    if (lk.exists() && lk.val() !== m.pid) { // الحساب المجهول مرتبط بهوية أخرى → نتبنّاها
      await adopt(lk.val()); cloud.ok = true; emit(); return lk.val();
    }
    if (!lk.exists()) {
      await set(ref(db, 'proof/' + user.uid), m.key);
      await set(ref(db, 'link/' + user.uid), m.pid);
    }
    const kd = await get(ref(db, 'keys/' + m.key));
    if (!kd.exists()) await set(ref(db, 'keys/' + m.key), m.pid);
    await set(ref(db, 'inv/' + m.pid), m.inv);
    await pushPub(true);
    m.u = user.uid; cloud.verified = true; saveNow();
    cloud.ok = true; cloud.err = null; emit();
    try { const p = ref(db, 'pres/' + m.pid); await set(p, true); onDisconnect(p).remove(); } catch (e) {}
    return m.pid;
  } catch (e) { cloud.ok = false; cloud.err = e.message || String(e); emit(); return null; }
}

// حساب مجهول مرتبط بهوية سحابية موجودة (جهاز عاد إليه المستخدم أو استعادة)
async function adopt(pid) {
  const [pub, pv] = await Promise.all([get(ref(db, 'pub/' + pid)), get(ref(db, 'priv/' + pid))]);
  const S = state(); const old = S.me || {};
  let key = old.key || null, inv = old.inv || null;
  try { const pf = await get(ref(db, 'proof/' + cloud.uid)); if (pf.exists()) key = pf.val(); } catch (e) {}
  if (pv.exists()) { try { const d = JSON.parse(pv.val().d); mergeBackup(d); } catch (e) {} }
  const S2 = state();
  S2.me = Object.assign({}, old, { pid, name: (pub.val() || {}).n || old.name || 'لاعب', av: (pub.val() || {}).a || old.av || '🦊', u: cloud.uid, key, inv: inv || rid(16) });
  saveNow(); save();
  try { await set(ref(db, 'inv/' + pid), S2.me.inv); const p = ref(db, 'pres/' + pid); await set(p, true); onDisconnect(p).remove(); } catch (e) {}
}

// استعادة بالرمز على جهاز جديد
export async function restoreByCode(code) {
  code = (code || '').trim().toLowerCase();
  if (code.length !== 12) throw new Error('الرمز يجب أن يكون 12 حرفًا');
  const user = await withTimeout(ready, 8000); cloud.uid = user.uid;
  const kd = await withTimeout(get(ref(db, 'keys/' + code)), 8000);
  if (!kd.exists()) throw new Error('لا يوجد حساب بهذا الرمز');
  const pid = kd.val();
  const lk = await get(ref(db, 'link/' + user.uid));
  if (!lk.exists()) { await set(ref(db, 'proof/' + user.uid), code); await set(ref(db, 'link/' + user.uid), pid); }
  else if (lk.val() !== pid) throw new Error('هذا الجهاز مرتبط بحساب آخر بالفعل');
  const [pub, pv, iv] = await Promise.all([get(ref(db, 'pub/' + pid)), get(ref(db, 'priv/' + pid)), get(ref(db, 'inv/' + pid))]);
  let data = {}; if (pv.exists()) { try { data = JSON.parse(pv.val().d); } catch (e) {} }
  const S = state();
  const next = Object.assign({}, S, data, { me: { pid, key: code, inv: S.me && S.me.inv || rid(16), name: (pub.val() || {}).n || data.name || 'لاعب', av: (pub.val() || {}).a || data.av || '🦊', u: user.uid, created: Date.now() } });
  next.pubXp = (pub.val() || {}).xp || 0;
  replaceAll(next); cloud.verified = true; cloud.ok = true; emit();
  await set(ref(db, 'inv/' + pid), state().me.inv);
  return state().me;
}

function mergeBackup(d) {
  const S = state();
  for (const k of ['cards', 'notes', 'stars', 'days', 'flags', 'read']) S[k] = Object.assign({}, d[k] || {}, S[k] || {});
  for (const id in (d.cards || {})) if (!S.cards[id] || (d.cards[id].s > S.cards[id].s)) S.cards[id] = d.cards[id];
  S.xp = Math.max(S.xp, d.xp || 0); S.streak = (d.streak && d.streak.best > S.streak.best) ? d.streak : S.streak;
  if (!S.log.length && d.log) S.log = d.log; if (d.settings) S.settings = Object.assign({}, d.settings, S.settings);
}

// ---- النشر العلني (الاسم/الأفاتار/الخبرة) بحد أقصى 300 خبرة لكل كتابة (تقيّده القواعد)
let pubTimer = null, pushing = false;
export function schedulePub() { clearTimeout(pubTimer); pubTimer = setTimeout(() => pushPub(), 2500); }
export async function pushPub(first = false) {
  const S = state(), m = S.me; if (!m || !cloud.ok && !first) return;
  if (pushing) return; pushing = true;
  try {
    const c = counts();
    const body = () => ({ n: m.name, a: m.av, xp: S.pubXp, st: S.streak.n, mw: c.mastered, w: Object.keys(S.cards).length, lw: serverTimestamp() });
    let guard = 0;
    do { S.pubXp = Math.min(S.xp, S.pubXp + 300); await set(ref(db, 'pub/' + m.pid), body()); guard++; } while (S.pubXp < S.xp && guard < 40);
    saveNow();
  } catch (e) { cloud.err = e.message; } finally { pushing = false; }
}

// ---- نسخ احتياطي للتقدّم
let bkTimer = null;
export function scheduleBackup() { clearTimeout(bkTimer); bkTimer = setTimeout(backupNow, 6000); }
export async function backupNow() {
  const S = state(), m = S.me; if (!m || !cloud.ok) return false;
  try {
    const d = { cards: S.cards, notes: S.notes, stars: S.stars, flags: S.flags, read: S.read, days: S.days, log: S.log.slice(0, 20), xp: S.xp, streak: S.streak, settings: S.settings, name: m.name, av: m.av };
    let str = JSON.stringify(d); if (str.length > 140000) { d.log = []; str = JSON.stringify(d); }
    await set(ref(db, 'priv/' + m.pid), { d: str, t: Date.now() }); return true;
  } catch (e) { cloud.err = e.message; return false; }
}
