// js/firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSyCgR48mh49OAybl6NocBna_Gq9XkOYLYb0",
    authDomain: "en-learning-6ff54.firebaseapp.com",
    databaseURL: "https://en-learning-6ff54-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "en-learning-6ff54",
    storageBucket: "en-learning-6ff54.firebasestorage.app",
    messagingSenderId: "61034103631",
    appId: "1:61034103631:web:c3d0175ace827397ebbb3a"
};

// تهيئة Firebase بالطريقة المتوافقة (Compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
