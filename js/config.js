// ===== API CONFIGURATION =====
// Real keys are stored as Environment Variables on Vercel
// These are just placeholders
const CONFIG = {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
};

window.CONFIG = CONFIG;
