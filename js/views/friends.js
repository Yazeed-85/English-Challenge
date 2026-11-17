import { state, levelInfo } from '../store.js';
import { cloud } from '../identity.js';
import { inviteLink, createDuel, acceptDuel, declineDuel, removeFriend, peek, sendRequest, acceptRequest, declineRequest } from '../net.js';
import { h, icon, avatar, toast, copyText, confirmBox, stagger, ago, sheet } from '../ui.js';

// نافذة اختيار نوع التحدّي مع صديق
export function challengeSheet(app, f) {
  const go = async (opt, btn) => { btn.disabled = true; try { const id = await createDuel(f.pid, opt); s.close(); app.goto('duel/' + id); } catch (e) { toast('تعذّر إرسال التحدّي', 'bad'); btn.disabled = false; } };
  const opt = (ic, title, sub, o) => h('button', { class: 'copt', onclick: e => go(o, e.currentTarget) }, h('span', { class: 'ci' }, ic), h('div', { class: 'grow' }, h('b', {}, title), h('small', {}, sub)));
  const s = sheet(h('div', { class: 'copts' },
    h('div', { class: 'sec-h' }, h('b', {}, '⚔️ تحدّي كلمات'), h('small', { class: 'muted' }, 'يبدأ سهلًا جدًا ويتدرّج')),
    opt('🌱', '١٠ كلمات', 'كلمة إنجليزية ← معناها بالعربية. وقت واسع ونتعلّم معًا', { k: 'q', n: 10 }),
    opt('🌿', '٢٠ كلمة', 'من السهل إلى المتوسط، مع الاستماع والعكس', { k: 'q', n: 20 }),
    opt('🌳', '٣٠ كلمة', 'تدرّج كامل حتى إكمال الجملة', { k: 'q', n: 30 }),
    h('div', { class: 'sec-h' }, h('b', {}, '📖 قراءة معًا'), h('small', { class: 'muted' }, 'وأنتما في مكالمة')),
    opt('📄', '٣ فقرات لكل واحد', 'كل لاعب فقرته بنفس المستوى، تقرأونها ثم تناقشونها', { k: 'r', n: 6 }),
    opt('📚', '٥ فقرات لكل واحد', 'جلسة أطول وتدرّج أكبر', { k: 'r', n: 10 }),
    opt('📕', '١٠ فقرات لكل واحد', 'ماراثون قراءة (20 فقرة)', { k: 'r', n: 20 })), { title: `تحدَّ ${f.n}` });
}

export function mount({ app }) {
  const el = h('section', { class: 'view friends' }); const S = state();
  const render = (anim) => {
    const y = scrollY; el.innerHTML = '';
    const link = inviteLink();
    const share = async () => { if (navigator.share) { try { await navigator.share({ title: 'YZ English', text: `${S.me.name} يدعوك لتتحدّاه في تعلّم الإنجليزية 🔥`, url: link }); return; } catch (e) { if (e.name === 'AbortError') return; } } copy(); };
    const copy = async () => toast((await copyText(link)) ? 'تم نسخ رابط الدعوة ✅' : 'تعذّر النسخ', 'good');
    el.append(h('h1', { class: 'ttl' }, 'الأصدقاء'));
    if (!cloud.ok) el.append(h('div', { class: 'note-box warn c-all' }, 'لا يوجد اتصال بالخادم حاليًا، لذا لا تعمل ميزات الأصدقاء. ', h('button', { class: 'link', onclick: async () => { await app.startOnline(); render(); } }, 'إعادة المحاولة')));
    if (app.joined) el.append(h('div', { class: 'note-box good c-all' }, `🎉 أصبحت صديقًا لـ ${app.joined.n}. تحدّاه الآن من القائمة أدناه!`));
    const left = h('div', { class: 'col-l' }), right = h('div', { class: 'col-r' });
    // طلبات الصداقة
    if (app.reqs.length) left.append(h('div', { class: 'card incoming' }, h('div', { class: 'sec-h' }, h('b', {}, '👋 طلبات صداقة')), h('div', { class: 'list' }, app.reqs.map(x => { const row = h('div', { class: 'li' }, avatar('🙂', 40), h('div', { class: 'grow' }, h('b', {}, '…'), h('small', { class: 'muted' }, ago(x.t))), h('button', { class: 'btn sm primary', onclick: async () => { try { await acceptRequest(x.from); toast('تمت الإضافة 🎉', 'good'); } catch (e) { toast('تعذّر القبول', 'bad'); } } }, 'قبول'), h('button', { class: 'btn sm ghost', onclick: () => declineRequest(x.from) }, 'رفض')); peek(x.from).then(p => { if (p) { row.firstChild.replaceWith(avatar(p.a, 40)); row.querySelector('b').textContent = p.n; } }); return row; }))));
    // التحدّيات الواردة
    if (app.inbox.length) left.append(h('div', { class: 'card incoming' }, h('div', { class: 'sec-h' }, h('b', {}, '⚔️ تحدّيات بانتظارك')), h('div', { class: 'list' }, app.inbox.map(x => { const f = app.friends.find(y => y.pid === x.from) || { n: 'صديق', a: '🙂' }; return h('div', { class: 'li' }, avatar(f.a, 40), h('div', { class: 'grow' }, h('b', {}, f.n), h('small', { class: 'muted' }, `يتحدّاك · ${ago(x.t)}`)), h('button', { class: 'btn sm primary', onclick: async () => { try { await acceptDuel(x.d, x.from); app.goto('duel/' + x.d); } catch (e) { toast('تعذّر القبول', 'bad'); } } }, 'قبول'), h('button', { class: 'btn sm ghost', onclick: () => declineDuel(x.d, x.from) }, 'رفض')); }))));
    // القائمة والترتيب
    const me = { pid: S.me.pid, n: S.me.name, a: S.me.av, xp: S.xp, me: true };
    const board = [...app.friends, me].sort((a, b) => (b.xp || 0) - (a.xp || 0));
    if (app.friends.length) left.append(h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'قائمتك'), h('small', { class: 'muted' }, `${app.friends.length} صديق`)),
      h('div', { class: 'list' }, board.map((f, i) => h('div', { class: 'li' + (f.me ? ' me' : '') }, h('span', { class: 'rank' }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1), h('div', { class: 'avwrap' }, avatar(f.a, 40), f.online ? h('i', { class: 'online' }) : null), h('div', { class: 'grow' }, h('b', {}, f.me ? `${f.n} (أنت)` : f.n), h('small', { class: 'muted' }, `مستوى ${levelInfo(f.xp || 0).lv} · ${f.xp || 0} خبرة${f.st ? ` · 🔥${f.st}` : ''}`)),
        f.me ? null : h('button', { class: 'btn sm primary', onclick: () => challengeSheet(app, f) }, icon('sword', 16), ' تحدَّ'),
        f.me ? null : h('button', { class: 'icon-btn sm', 'aria-label': 'حذف', onclick: async () => { if (await confirmBox(`حذف ${f.n} من أصدقائك؟`, 'حذف', true)) { await removeFriend(f.pid); toast('تم الحذف'); } } }, icon('trash', 18)))))));
    // إضافة بمعرّف
    const idIn = h('input', { class: 'inp ltr', dir: 'ltr', maxlength: 12, placeholder: 'ألصق معرّف صديقك (12 حرفًا)' });
    const addBtn = h('button', { class: 'btn primary', onclick: async () => { const v = idIn.value.trim().toLowerCase(); if (v.length !== 12) { toast('المعرّف يتكوّن من 12 حرفًا', 'bad'); return; } addBtn.disabled = true; try { const p = await sendRequest(v); toast(`أُرسل طلب الصداقة إلى ${p.n} ✅`, 'good'); idIn.value = ''; } catch (e) { toast(e.message || 'تعذّر الإرسال', 'bad'); } addBtn.disabled = false; } }, 'إرسال طلب');
    right.append(h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'إضافة بالمعرّف')), h('p', { class: 'muted' }, 'إن كان لديك معرّف صديقك الذي يجده في صفحة «أنا»، ألصقه هنا وسيصله طلب يقبله بضغطة.'), h('div', { class: 'row gap' }, idIn, addBtn)));
    right.append(h('div', { class: 'card invite' }, h('div', { class: 'tag' }, app.friends.length ? 'ادعُ المزيد' : 'ابدأ هنا'), h('h2', {}, app.friends.length ? 'رابط دعوتك الشخصي' : 'ادعُ صديقك الأول'),
      h('p', { class: 'muted' }, 'أرسل هذا الرابط مرة واحدة. عندما يفتحه صديقك وينشئ حسابه تصبحان صديقين تلقائيًا، ومن بعدها تتحدّاه من القائمة بضغطة بلا روابط ولا أرقام غرف.'),
      h('div', { class: 'linkbox', dir: 'ltr' }, link), h('div', { class: 'row gap' }, h('button', { class: 'btn primary grow', onclick: share }, icon('share', 18), ' مشاركة'), h('button', { class: 'btn ghost grow', onclick: copy }, icon('copy', 18), ' نسخ'))));
    if (S.duels.length) right.append(h('div', { class: 'card' }, h('div', { class: 'sec-h' }, h('b', {}, 'آخر النشاطات المشتركة')), h('div', { class: 'list' }, S.duels.slice(0, 6).map(d => h('div', { class: 'li' }, avatar(d.av, 36), h('div', { class: 'grow' }, h('b', {}, d.k === 'r' ? `قراءة مع ${d.opp}` : `ضد ${d.opp}`), h('small', { class: 'muted' }, (d.k === 'r' ? `${d.my} فقرات` : `${d.my} - ${d.their}`) + ' · ' + ago(d.t))), h('span', { class: 'pill ' + (d.res === 'w' || d.res === 'r' ? 'good' : d.res === 'l' ? 'bad' : '') }, d.res === 'w' ? 'فوز' : d.res === 'l' ? 'خسارة' : d.res === 'r' ? 'أُنجزت' : 'تعادل'))))));
    el.append(h('div', { class: 'two' }, left, right));
    if (anim) stagger(el.querySelectorAll('.card'), { stagger: .05 }); else scrollTo(0, y);
  };
  render(true);
  let tm; const again = () => { clearTimeout(tm); tm = setTimeout(() => { if (el.isConnected) render(false); }, 250); };
  window.addEventListener('app:inbox', again); window.addEventListener('app:friends', again); window.addEventListener('app:joined', again);
  return { el, destroy() { window.removeEventListener('app:inbox', again); window.removeEventListener('app:friends', again); window.removeEventListener('app:joined', again); } };
}
