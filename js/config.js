// ===== API CONFIGURATION =====
// These keys are injected by Vercel during build
// The actual values come from Environment Variables
const CONFIG = {
    YOUTUBE_API_KEY: window.YOUTUBE_API_KEY || '',
    GEMINI_API_KEY: window.GEMINI_API_KEY || ''
};

window.CONFIG = CONFIG;
