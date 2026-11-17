// الأصدقاء والدعوات والتحديات (Firebase RTDB). لا غرف ولا أرقام: رابط دعوة شخصي مرة واحدة، ثم التحدّي من القائمة.
import { db, ref, get, set, update, remove, onValue, serverTimestamp, serverNow, withTimeout, ready } from './firebase.js';
import { state } from './store.js';
import { rid, cloud } from './identity.js';

export const myPid = () => state().me && state().me.pid;
export const inviteLink = () => { const m = state().me; return `${location.origin}${location.pathname}#/join/${m.pid}.${m.inv}`; };
export const parseJoin = h => { const m = /^#\/join\/([a-z0-9]{12})\.([a-z0-9]{8,24})$/.exec(h || ''); return m ? { pid: m[1], tok: m[2] } : null; };

export async function peek(pid) { const s = await withTimeout(get(ref(db, 'pub/' + pid)), 8000); return s.exists() ? Object.assign({ pid }, s.val()) : null; }

export async function redeem(pid, tok) {
  const me = myPid(); if (pid === me) throw new Error('هذا رابطك أنت!');
  const p = await peek(pid); if (!p) throw new Error('صاحب الرابط غير موجود');
  try {
    await update(ref(db), { [`friends/${pid}/${me}`]: tok, [`friends/${me}/${pid}`]: '1' });
  } catch (e) { throw new Error('الرابط قديم أو غير صالح — اطلب رابطًا جديدًا من صديقك'); }
  return p;
}

export async function removeFriend(pid) {
  const me = myPid();
  await update(ref(db), { [`friends/${me}/${pid}`]: null, [`friends/${pid}/${me}`]: null });
}

// قائمة الأصدقاء مع بياناتهم الحيّة
export function watchFriends(cb) {
  const me = myPid(); const subs = {}; let list = {};
  const out = () => cb(Object.values(list).sort((a, b) => (b.xp || 0) - (a.xp || 0)));
  const off0 = onValue(ref(db, 'friends/' + me), snap => {
    const ids = Object.keys(snap.val() || {});
    for (const id of Object.keys(subs)) if (!ids.includes(id)) { subs[id].forEach(f => f()); delete subs[id]; delete list[id]; }
    for (const id of ids) if (!subs[id]) {
      list[id] = { pid: id, n: '…', a: '🙂', xp: 0 };
      subs[id] = [
        onValue(ref(db, 'pub/' + id), s => { list[id] = Object.assign({}, list[id], s.val() || {}, { pid: id }); out(); }),
        onValue(ref(db, 'pres/' + id), s => { list[id] = Object.assign({}, list[id], { online: !!s.val() }); out(); })
      ];
    }
    out();
  });
  return () => { off0 && off0(); Object.values(subs).forEach(a => a.forEach(f => f())); };
}

export function watchInbox(cb) {
  const me = myPid();
  return onValue(ref(db, 'inbox/' + me), s => { const v = s.val() || {}; cb(Object.keys(v).map(from => ({ from, d: v[from].d, t: v[from].t })).sort((a, b) => b.t - a.t)); });
}

export async function createDuel(friendPid, lv = 0) {
  const me = myPid(); const id = rid(10);
  await set(ref(db, 'duels/' + id), { a: me, b: friendPid, seed: 1 + Math.floor(Math.random() * 2e9), n: 8, lv, st: 'invite', c: Date.now() });
  await set(ref(db, `inbox/${friendPid}/${me}`), { d: id, t: Date.now() });
  return id;
}
export const watchDuel = (id, cb) => onValue(ref(db, 'duels/' + id), s => cb(s.val()));
export async function acceptDuel(id, from) {
  await update(ref(db), { [`duels/${id}/st`]: 'play', [`duels/${id}/t0`]: serverTimestamp() });
  if (from) remove(ref(db, `inbox/${myPid()}/${from}`)).catch(() => {});
}
export async function declineDuel(id, from) {
  try { await set(ref(db, `duels/${id}/st`), 'no'); } catch (e) {}
  if (from) remove(ref(db, `inbox/${myPid()}/${from}`)).catch(() => {});
}
export async function cancelDuel(id, to) { try { await set(ref(db, `duels/${id}/st`), 'no'); } catch (e) {} if (to) remove(ref(db, `inbox/${to}/${myPid()}`)).catch(() => {}); }
export const sendAnswer = (id, i, choice, ms) => set(ref(db, `duels/${id}/ans/${myPid()}/${i}`), `${choice}:${Math.min(99999, Math.max(0, Math.round(ms)))}`);
export const finishDuel = id => set(ref(db, `duels/${id}/st`), 'done').catch(() => {});
export const dropDuel = id => remove(ref(db, 'duels/' + id)).catch(() => {});
export { serverNow };
