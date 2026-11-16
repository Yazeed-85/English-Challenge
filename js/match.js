// إدارة شاشة اللعب والمزامنة (match.html)
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get('id');

let currentMatchRef = null;
let isPlayer1 = false;
let wordsPool = [];
let currentWordObj = null;

if (!matchId) {
    alert("رابط الدعوة غير صحيح.");
    window.location.href = "index.html";
}

function initMatch(user) {
    currentMatchRef = db.ref('matches/' + matchId);
    
    currentMatchRef.once('value', (snap) => {
        const matchData = snap.val();
        
        if (!matchData) {
            alert("الجلسة غير موجودة أو انتهت.");
            window.location.href = "index.html";
            return;
        }

        // تسجيل الدخول كلاعب 2 إذا لم يكن هو صاحب الغرفة (اللاعب 1)
        if (matchData.player1 === user.uid) {
            isPlayer1 = true;
        } else if (!matchData.player2) {
            // انضمام كلاعب 2
            db.ref('users/' + user.uid + '/profile').once('value', (uSnap) => {
                currentMatchRef.update({
                    player2: user.uid,
                    p2Name: uSnap.val().name,
                    status: 'playing'
                });
            });
        } else if (matchData.player2 !== user.uid) {
            alert("الغرفة ممتلئة.");
            window.location.href = "index.html";
            return;
        }

        startSync();
    });
}

function startSync() {
    wordsPool = window.Dictionary.level_1; // يمكن لاحقاً ربطها بالمستوى

    currentMatchRef.on('value', (snap) => {
        const data = snap.val();
        if (!data) return;

        if (data.status === 'playing') {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'flex';
            
            // تحديث الأسماء والنقاط
            document.getElementById('p1-name').innerText = data.p1Name || 'المضيف';
            document.getElementById('p2-name').innerText = data.p2Name || 'الضيف';
            document.getElementById('p1-score').innerText = data.score1 || 0;
            document.getElementById('p2-score').innerText = data.score2 || 0;

            // تمييز اسم اللاعب الحالي
            document.getElementById(isPlayer1 ? 'p1-name' : 'p2-name').style.color = "var(--primary)";

            loadWordUI(data.currentWordIndex);
        }
    });
}

function loadWordUI(index) {
    // التأكد من عدم عرض النافذة
    document.getElementById('explanation-popup').style.display = 'none';
    
    // إذا انتهت الكلمات
    if (index >= wordsPool.length) {
        document.getElementById('english-word').innerText = "Game Over!";
        document.getElementById('options-container').innerHTML = "";
        return;
    }

    currentWordObj = wordsPool[index];
    document.getElementById('english-word').innerText = currentWordObj.word;

    // خلط الخيارات
    let options = [...currentWordObj.wrongOptions, currentWordObj.correct];
    options.sort(() => Math.random() - 0.5); // Shuffle

    const container = document.getElementById('options-container');
    container.innerHTML = "";
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, btn);
        container.appendChild(btn);
    });
    
    // حركة دخول خفيفة للكلمات
    gsap.from(".option-btn", {y: 20, opacity: 0, duration: 0.3, stagger: 0.1});
}

function handleAnswer(selectedText, btnElement) {
    // تعطيل كل الأزرار
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    const isCorrect = (selectedText === currentWordObj.correct);
    
    if (isCorrect) {
        btnElement.classList.add('correct');
        // زيادة النقاط (فقط للاعب الذي ضغط)
        const scoreRef = isPlayer1 ? 'score1' : 'score2';
        currentMatchRef.child(scoreRef).transaction(s => (s || 0) + 10);
        
        // زيادة XP في الحساب الشخصي
        db.ref('users/' + currentUser.uid + '/profile/xp').transaction(xp => (xp || 0) + 5);
        
    } else {
        btnElement.classList.add('wrong');
        // تلوين الإجابة الصحيحة
        buttons.forEach(b => {
            if (b.innerText === currentWordObj.correct) b.classList.add('correct');
        });
        
        // تسجيل الكلمة في الأخطاء
        db.ref('users/' + currentUser.uid + '/mistakes/' + currentWordObj.word).set(true);
    }

    showExplanation(isCorrect);
}

function showExplanation(isCorrect) {
    document.getElementById('result-status').innerText = isCorrect ? "إجابة صحيحة! 🎉" : "إجابة خاطئة! ❌";
    document.getElementById('result-status').style.color = isCorrect ? "var(--success)" : "var(--danger)";
    
    document.getElementById('popup-word').innerText = currentWordObj.word;
    document.getElementById('popup-meaning').innerText = currentWordObj.correct;
    document.getElementById('popup-explanation').innerText = currentWordObj.explanation;
    document.getElementById('popup-example').innerText = `"${currentWordObj.example}"`;
    
    const popup = document.getElementById('explanation-popup');
    popup.style.display = 'flex';
    gsap.fromTo(popup.querySelector('.modal-content'), 
        { scale: 0.8, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
    );
    
    // نطق الكلمة تلقائياً
    window.speakWord(currentWordObj.word);

    // عداد للانتقال للكلمة التالية (يديره المضيف فقط لعدم التضارب)
    let secondsLeft = 5;
    const timerSpan = document.getElementById('next-timer');
    timerSpan.innerText = secondsLeft;
    
    const interval = setInterval(() => {
        secondsLeft--;
        timerSpan.innerText = secondsLeft;
        if (secondsLeft <= 0) {
            clearInterval(interval);
            if (isPlayer1) {
                // المضيف يغير الـ Index لكليهما
                currentMatchRef.child('currentWordIndex').transaction(i => (i || 0) + 1);
            }
        }
    }, 1000);
}

window.playCurrentWordAudio = function() {
    if (currentWordObj) {
        window.speakWord(currentWordObj.word);
    }
}
