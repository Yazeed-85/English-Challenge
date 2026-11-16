// إدارة شاشة اللوبي (index.html)
function updateLobbyUI(user) {
    const profileRef = db.ref('users/' + user.uid + '/profile');
    const mistakesRef = db.ref('users/' + user.uid + '/mistakes');

    // جلب البيانات الشخصية
    profileRef.on('value', (snap) => {
        const data = snap.val();
        if (data) {
            document.getElementById('player-name').innerText = data.name;
            document.getElementById('player-level').innerText = 'المستوى: ' + data.level;
            document.getElementById('stat-xp').innerText = data.xp;
        }
    });

    // جلب عدد الأخطاء
    mistakesRef.on('value', (snap) => {
        const mistakes = snap.val();
        const count = mistakes ? Object.keys(mistakes).length : 0;
        document.getElementById('stat-mistakes').innerText = count;
    });
}

// توليد رابط الدعوة
document.getElementById('btn-invite')?.addEventListener('click', () => {
    if (!currentUser) return alert("جاري تسجيل الدخول...");

    const btn = document.getElementById('btn-invite');
    btn.innerText = "جاري التجهيز...";
    btn.disabled = true;

    const matchRef = db.ref('matches').push();
    const matchId = matchRef.key;

    matchRef.set({
        player1: currentUser.uid,
        p1Name: document.getElementById('player-name').innerText,
        status: 'waiting',
        score1: 0,
        score2: 0,
        currentWordIndex: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        const inviteLink = `${window.location.origin}/match.html?id=${matchId}`;
        const linkContainer = document.getElementById('invite-link-container');
        const linkInput = document.getElementById('invite-link-input');
        
        btn.style.display = 'none';
        linkContainer.style.display = 'block';
        linkInput.value = inviteLink;
        
        // أنيميشن ظهور خفيف
        gsap.from(linkContainer, {opacity: 0, y: -10, duration: 0.3});

        // الاستماع لدخول الخصم
        matchRef.child('status').on('value', (snap) => {
            if (snap.val() === 'playing') {
                document.getElementById('waiting-status').innerText = "تم انضمام الخصم! جاري الانتقال...";
                document.getElementById('waiting-status').style.color = "var(--success)";
                setTimeout(() => {
                    window.location.href = inviteLink;
                }, 1000);
            }
        });
    });
});

// نسخ الرابط
document.getElementById('btn-copy')?.addEventListener('click', () => {
    const input = document.getElementById('invite-link-input');
    input.select();
    navigator.clipboard.writeText(input.value);
    document.getElementById('btn-copy').innerText = "تم النسخ! ✓";
    document.getElementById('btn-copy').classList.replace('btn-secondary', 'btn-success');
});

// فتح وإغلاق نافذة الأخطاء
document.getElementById('btn-review')?.addEventListener('click', () => {
    const modal = document.getElementById('review-modal');
    modal.style.display = 'flex';
    gsap.from(".modal-content", {y: 50, opacity: 0, duration: 0.3});

    const list = document.getElementById('mistakes-list');
    list.innerHTML = "جاري التحميل...";

    db.ref('users/' + currentUser.uid + '/mistakes').once('value', (snap) => {
        const mistakes = snap.val();
        list.innerHTML = "";
        if (!mistakes) {
            list.innerHTML = "<p>لا يوجد أخطاء مسجلة. أداؤك مثالي!</p>";
            return;
        }

        // بما أن المعنى غير محفوظ في عقدة الأخطاء مباشرة (فقط الكلمة كمفتاح)، سنكتفي بعرض الكلمة وزر نطق
        Object.keys(mistakes).forEach(word => {
            list.innerHTML += `
                <div class="mistake-item">
                    <span class="eng-text" style="font-size: 1.2rem; font-weight:bold;">${word}</span>
                    <button class="btn btn-secondary" style="width:auto; padding: 5px 15px;" onclick="window.speakWord('${word}')">🔊</button>
                </div>
            `;
        });
    });
});

document.getElementById('close-modal')?.addEventListener('click', () => {
    document.getElementById('review-modal').style.display = 'none';
});
