// الاتصال بـ Firebase (مجهول الهوية). التطبيق يعمل محليًا بدونه؛ هذا للأصدقاء والنسخ الاحتياطي فقط.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = rtdb.getDatabase(app);
export const { ref, get, set, update, remove, onValue, onDisconnect, serverTimestamp } = rtdb;

export const ready = (async () => {
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
})();
ready.catch(() => {});

let offset = 0;
try { onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; }); } catch (e) {}
export const serverNow = () => Date.now() + offset;
export const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
