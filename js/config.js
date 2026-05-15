// ===== API CONFIGURATION =====
// All API keys are now stored as Vercel Environment Variables
// The frontend calls our proxy endpoints instead of Google directly
const CONFIG = {
    PROXY_YOUTUBE: '/api/youtube',
    PROXY_GEMINI: '/api/gemini'
};

window.CONFIG = CONFIG;
