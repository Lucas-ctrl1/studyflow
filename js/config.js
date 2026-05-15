// ===== API CONFIGURATION =====
const CONFIG = {
    YOUTUBE_API_KEY: 'AIzaSyBbc6gPuVxD5NVFYUc3fxFEOeSwgLUGqAg',
    GEMINI_API_KEY: 'AIzaSyC8oS6Hqx537nANhWKkGNXnCeFlHSv01kM'
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}