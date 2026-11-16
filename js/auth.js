// إدارة تسجيل الدخول وتجهيز الملف الشخصي
let currentUser = null;

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("Logged in as:", user.uid);
        
        // التحقق من وجود حساب وتحديث الاسم إن لم يكن موجوداً
        const userRef = db.ref('users/' + user.uid + '/profile');
        userRef.once('value', (snap) => {
            if (!snap.exists()) {
                userRef.set({
                    name: "ضيف_" + Math.floor(Math.random() * 10000),
                    level: 1,
                    xp: 0
                });
            }
        });

        // استدعاء دالة تحديث الواجهة إذا كنا في اللوبي
        if (typeof updateLobbyUI === 'function') {
            updateLobbyUI(user);
        }
        
        // استدعاء دالة تهيئة اللعب إذا كنا في شاشة اللعب
        if (typeof initMatch === 'function') {
            initMatch(user);
        }

    } else {
        // تسجيل دخول مجهول تلقائياً
        auth.signInAnonymously().catch((error) => {
            console.error("Auth Error:", error);
            alert("فشل تسجيل الدخول. تأكد من تفعيل Anonymous Auth في Firebase.");
        });
    }
});
