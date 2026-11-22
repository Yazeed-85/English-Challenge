// التطبيق: التوجيه (hash) + الانتقالات + تهيئة الهوية. كل شاشة تُصدّر mount(ctx) وتُرجع { el, destroy }.
import { state, subscribe, save } from './store.js';
import { connect, cloud, me, schedulePub, scheduleBackup, onCloud } from './identity.js';
import { parseJoin, redeem, watchInbox, watchFriends, watchRequests, peek } from './net.js';
import { h, icon, toast, $, confetti } from './ui.js';
import { registerCustom } from './lookup.js';
import { refreshBookBadge, bump } from './flag.js';
import { BY_ID } from './words.js';
registerCustom();

const routes = {
  home: () => import('./views/home.js'),
  practice: () => import('./views/practice.js'),
  words: () => import('./views/words.js'),
  friends: () => import('./views/friends.js'),
  me: () => import('./views/profile.js'),
  session: () => import('./views/session.js'),
  duel: () => import('./views/duel.js'),
  read: () => import('./views/read.js'),
  onboard: () => import('./views/onboard.js')
};
const TABS = [['home', 'الرئيسية', 'home'], ['practice', 'تدرّب', 'target'], ['words', 'دفتري', 'book'], ['friends', 'الأصدقاء', 'users'], ['me', 'أنا', 'user']];
const FULL = new Set(['session', 'duel', 'onboard']);

export const app = { inbox: [], friends: [], reqs: [], goto, cloud, join: null };
export function goto(path, replace = false) { if (replace) history.replaceState(null, '', '#/' + path); else location.hash = '#/' + path; if (replace) route(); }

const view = $('#view'), tabs = $('#tabs');
let cur = null, token = 0;

function buildTabs() {
  tabs.innerHTML = '';
  for (const [id, label, ic] of TABS) tabs.append(h('a', { href: '#/' + id, 'data-t': id }, icon(ic, 24), h('span', {}, label), h('b', { class: 'dot', hidden: true })));
}
buildTabs();
function setTab(name) {
  tabs.hidden = FULL.has(name);
  document.body.classList.toggle('full', FULL.has(name));
  const hl = name === 'read' ? 'practice' : name;
  for (const a of tabs.children) a.classList.toggle('on', a.dataset.t === hl);
  refreshBookBadge();
  badge();
}
function badge() {
  const d = tabs.querySelector('[data-t=friends] .dot'); if (d) d.hidden = !(app.inbox.length || app.reqs.length);
}

async function route() {
  const hash = location.hash || '';
  const j = parseJoin(hash);
  if (j) { app.join = j; state().pendingJoin = j; save(); history.replaceState(null, '', location.pathname + location.search + '#/' + (me() ? 'friends' : 'onboard')); return route(); }
  let [name, ...args] = hash.replace(/^#\//, '').split('/');
  if (!me()) name = 'onboard';
  else if (!routes[name] || name === 'onboard') name = 'home';
  const my = ++token;
  const mod = await routes[name]();
  if (my !== token) return;
  const next = mod.mount({ args, app });
  const old = cur; cur = next;
  setTab(name);
  view.append(next.el);
  next.el.classList.add('page');
  window.scrollTo(0, 0);
  // نظّف كل ما بقي من صفحات سابقة (حتى لو تنقّل المستخدم بسرعة) حتى لا تتكدّس الصفحات
  [...view.children].filter(n => n !== next.el && !n.dataset.leaving).forEach(n => { n.dataset.leaving = 1; gsap.killTweensOf(n); gsap.to(n, { opacity: 0, y: -8, duration: .16, onComplete: () => n.remove() }); setTimeout(() => n.remove(), 700); });
  if (old) {
    old.destroy && old.destroy();
    gsap.fromTo(next.el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .38, ease: 'power3.out', delay: .1, clearProps: 'transform,opacity' });
  } else gsap.fromTo(next.el, { opacity: 0 }, { opacity: 1, duration: .5, clearProps: 'opacity' });
  next.after && next.after();
}
window.addEventListener('hashchange', route);

// ---- بعد وجود هوية: الاتصال والمراقبة
let watching = false, offInbox = null, offFriends = null;
export async function startOnline() {
  const pid = await connect();
  if (!me()) return pid;
  const pending = state().pendingJoin;
  if (cloud.ok && !watching) {
    watching = true;
    offInbox = watchInbox(list => { const fresh = list.filter(x => !app.inbox.some(y => y.d === x.d)); app.inbox = list; badge(); if (fresh.length && !FULL.has((location.hash.split('/')[1] || ''))) { toast('🎮 لديك تحدٍّ جديد من صديق!'); } window.dispatchEvent(new Event('app:inbox')); });
    watchRequests(list => { const fresh = list.length > app.reqs.length; app.reqs = list; badge(); if (fresh) toast('👋 طلب صداقة جديد'); window.dispatchEvent(new Event('app:inbox')); });
    offFriends = watchFriends(list => { app.friends = list; window.dispatchEvent(new Event('app:friends')); });
  }
  if (cloud.ok && pending) {
    try {
      const p = await redeem(pending.pid, pending.tok); state().pendingJoin = null; save();
      app.joined = p; toast(`🎉 أصبحت صديقًا لـ ${p.n}`, 'good'); window.dispatchEvent(new Event('app:joined'));
    } catch (e) { state().pendingJoin = null; save(); toast(e.message, 'bad'); }
  }
  return pid;
}
subscribe(() => { schedulePub(); scheduleBackup(); });
window.addEventListener('word:learned', e => { const w = BY_ID[e.detail]; toast(`✅ تعلّمتَ كلمة «${w ? w.en : ''}» — انتقلت إلى دفترك كمتعلَّمة`, 'good'); confetti(40); const t = document.querySelector('#tabs a[data-t=words]'); t && bump(t); });
window.addEventListener('online', () => startOnline());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !cloud.ok && me()) startOnline(); });
app.startOnline = startOnline;

(async () => {
  const j = parseJoin(location.hash); if (j) { state().pendingJoin = j; save(); history.replaceState(null, '', location.pathname + location.search + '#/' + (me() ? 'friends' : 'onboard')); }
  if (!me()) {
    // لا ملف محلي: لعلّ الحساب المجهول مرتبط بهوية سابقة في السحابة → استعادة تلقائية
    await route();
    try { const pid = await Promise.race([connect(), new Promise(r => setTimeout(() => r(null), 2500))]); if (pid && !me()) { await startOnline(); } } catch (e) {}
    if (me()) route();
    return;
  }
  await route();
  startOnline();
})();
