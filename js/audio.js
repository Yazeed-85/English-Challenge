// نظام النطق عبر متصفح الويب
window.speakWord = function(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.85; // نطق بطيء قليلاً للمتعلمين
        
        const voices = window.speechSynthesis.getVoices();
        const naturalVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.lang === 'en-US');
        if (naturalVoice) utterance.voice = naturalVoice;

        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("Speech Synthesis not supported in this browser.");
    }
};

// تحميل الأصوات مسبقاً (مطلوب لبعض المتصفحات كـ Chrome)
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = function() {
        window.speechSynthesis.getVoices();
    };
}
