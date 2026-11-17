import { state, save } from '../store.js';
import { cloud } from '../identity.js';
import { inviteLink, createDuel, acceptDuel, declineDuel, removeFriend, peek } from '../net.js';
import { h, icon, avatar, toast, copyText, confirmBox, stagger, ago } from '../ui.js';
import { levelInfo } from '../store.js';

export function mount({ app }) {
  const el = h('section', { class: 'view friends' });
  const S = state();
  const render = () => {
    el.innerHTML = '';
    const link = cloud.ok || S.me ? inviteLink() : '';
    const share = async () => { if (navigator.share) { try { await navigator.share({ title: 'English Challenge', text: `${S.me.name} يدعوك لتتحدّاه في تعلّم الإنجليزية 🔥`, url: link }); return; } catch (e) { if (e.name === 'AbortError') return; } } copy(); };
    const copy = async () => { toast((await copyText(link)) ? 'تم نسخ رابط الدعوة ✅' : 'تعذّر النسخ', 'good'); };
    el.append(h('h1', { class: 'ttl' }, 'الأصدقاء'));
    if (!cloud.ok) el.append(h('div', { class: 'note-box warn' }, 'لا يوجد اتصال بالخادم حاليًا، لذا لا تعمل ميزات الأصدقاء. ', h('button', { class: 'link', onclick: async () => { await app.startOnline(); render(); } }, 'إعادة المحاولة')));
    if (app.joined) el.append(h('div', { class: 'note-box good' }, `🎉 أصبحت صديقًا لـ ${app.joined.n}. تحدّاه الآن من القائمة أدناه!`));
    // الدعوات الواردة
    if (app.inbox.length) {
      el.append(h('div', { class: 'card incoming' }, h('div', { class: 'sec-h' }, h('b', {}, '⚔️ تحدّيات بانتظارك')),
        h('div', { class: 'list' }, app.inbox.map(x => { const f = app.friends.find(y => y.pid === x.from) || { n: 'صديق', a: '🙂' }; return h('div', { class: 'li' }, avatar(f.a, 40), h('div', { class: 'grow' }, h('b', {}, f.n), h('small', { class: 'muted' }, `يتحدّاك · ${ago(x.t)}`)), h('button', { class: 'btn sm primary', onclick: async () => { try { await acceptDuel(x.d, x.from); app.goto('duel/' + x.d); } catch (e) { toast('تعذّر القبول', 'bad'); } } }, 'قبول'), h('button', { class: 'btn sm ghost', onclick: () => declineDuel(x.d, x.from) }, 'رفض')); }))));
    }
    // الترتيب
    const me = { pid: S.me.pid, n: S.me.name, a: S.me.av, xp: S.xp, me: true };
    const board = [...app.friends, me].sort((a, b) => (b.xp || 0) - (a.xp || 0));
    if (app.friends.length) {
      el.append(h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'قائمتك'), h('small', { class: 'muted' }, `${app.friends.length} صديق`)),
        h('div', { class: 'list' }, board.map((f, i) => h('div', { class: 'li' + (f.me ? ' me' : '') }, h('span', { class: 'rank' }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1), h('div', { class: 'avwrap' }, avatar(f.a, 40), f.online ? h('i', { class: 'online' }) : null), h('div', { class: 'grow' }, h('b', {}, f.me ? `${f.n} (أنت)` : f.n), h('small', { class: 'muted' }, `مستوى ${levelInfo(f.xp || 0).lv} · ${f.xp || 0} خبرة${f.st ? ` · 🔥${f.st}` : ''}`)),
          f.me ? null : h('button', { class: 'btn sm primary', onclick: async e => { e.currentTarget.disabled = true; try { const id = await createDuel(f.pid, 0); app.goto('duel/' + id); } catch (er) { toast('تعذّر إرسال التحدّي', 'bad'); e.target.disabled = false; } } }, icon('sword', 16), ' تحدَّ'),
          f.me ? null : h('button', { class: 'icon-btn sm', 'aria-label': 'حذف', onclick: async () => { if (await confirmBox(`حذف ${f.n} من أصدقائك؟`, 'حذف', true)) { await removeFriend(f.pid); toast('تم الحذف'); } } }, icon('trash', 18)))))));
    }
    // الدعوة
    el.append(h('div', { class: 'card invite' }, h('div', { class: 'tag' }, app.friends.length ? 'ادعُ المزيد' : 'ابدأ هنا'), h('h2', {}, app.friends.length ? 'رابط دعوتك الشخصي' : 'ادعُ صديقك الأول'),
      h('p', { class: 'muted' }, 'أرسل هذا الرابط مرة واحدة. عندما يفتحه صديقك ويُنشئ حسابه تصبحان صديقين تلقائيًا، ومن بعدها تتحدّاه من القائمة بضغطة بلا روابط ولا أرقام غرف.'),
      h('div', { class: 'linkbox', dir: 'ltr' }, link), h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: share }, icon('share', 18), ' مشاركة'), h('button', { class: 'btn ghost grow', onclick: copy }, icon('copy', 18), ' نسخ'))));
    // سجل التحدّيات
    if (S.duels.length) el.append(h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'آخر مبارياتك')), h('div', { class: 'list' }, S.duels.slice(0, 6).map(d => h('div', { class: 'li' }, avatar(d.av, 36), h('div', { class: 'grow' }, h('b', {}, `ضد ${d.opp}`), h('small', { class: 'muted' }, `${d.my} - ${d.their} · ${ago(d.t)}`)), h('span', { class: 'pill ' + (d.res === 'w' ? 'good' : d.res === 'l' ? 'bad' : '') }, d.res === 'w' ? 'فوز' : d.res === 'l' ? 'خسارة' : 'تعادل'))))));
    stagger(el.children, { stagger: .05 });
  };
  render();
  const again = () => { if (el.isConnected) render(); };
  window.addEventListener('app:inbox', again); window.addEventListener('app:friends', again); window.addEventListener('app:joined', again);
  return { el, destroy() { window.removeEventListener('app:inbox', again); window.removeEventListener('app:friends', again); window.removeEventListener('app:joined', again); } };
}
