export const firebaseConfig = {
  apiKey: "AIzaSyCgR48mh49OAybl6NocBna_Gq9XkOYLYb0",
  authDomain: "en-learning-6ff54.firebaseapp.com",
  databaseURL: "https://en-learning-6ff54-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "en-learning-6ff54",
  storageBucket: "en-learning-6ff54.firebasestorage.app",
  messagingSenderId: "61034103631",
  appId: "1:61034103631:web:c3d0175ace827397ebbb3a"
};
export const APP_NAME = 'English Challenge';
export const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🦉', '🐙', '🦄', '🐬', '🦋', '🐲', '🚀', '🌟', '🎯', '🔥', '⚡'];
export const DUEL = { n: 8, secs: 12, countdown: 3500 };
export const XP = { correct: 10, bonus: 20, goal: 30, duelWin: 40, duelLose: 15 };
export const LEVEL_XP = lv => 100 * lv * (lv + 1) / 2; // XP اللازم للوصول لمستوى lv (lv=1→100)
