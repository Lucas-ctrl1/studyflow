// ===== STUDY ROADMAP - FIXED VERSION =====

// Get API key from config
function getApiKey() {
    if (typeof CONFIG !== 'undefined' && CONFIG.GEMINI_API_KEY) {
        return CONFIG.GEMINI_API_KEY;
    }
    return process.env.GEMINI_API_KEY || ''; // Fallback
}

// Call Gemini API
async function callGemini(prompt) {
    const API_KEY = getApiKey();
    const MODEL_NAME = 'models/gemini-2.5-flash-lite';
    
    const trimmedPrompt = prompt.length > 8000 ? prompt.substring(0, 8000) : prompt;
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: trimmedPrompt }]
                    }]
                })
            }
        );
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Gemini error:', data.error);
            if (data.error.code === 429) {
                return '⚠️ Rate limit. Please wait a moment and try again.';
            }
            if (data.error.code === 403) {
                return '⚠️ API key issue. Please check your configuration.';
            }
            return `⚠️ ${data.error.message}`;
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        console.error('Network error:', err);
        return `⚠️ Network error: ${err.message}`;
    }
}

// Get learning topics from watch history
function getLearningTopics() {
    const watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    
    const allText = [...watchHistory, ...savedSummaries].map(v => v.title.toLowerCase()).join(' ');
    
    const topics = [];
    const topicKeywords = {
        'Python': ['python', 'django', 'flask', 'pandas', 'numpy'],
        'JavaScript': ['javascript', 'js', 'node', 'react', 'vue', 'angular'],
        'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'neural', 'deep learning', 'tensorflow'],
        'Web Development': ['html', 'css', 'web', 'frontend', 'backend', 'full stack'],
        'Data Science': ['data science', 'data analysis', 'analytics', 'sql', 'database'],
        'Design': ['design', 'ui', 'ux', 'figma', 'photoshop', 'illustrator'],
        'Business': ['business', 'marketing', 'sales', 'entrepreneur', 'startup'],
        'Science': ['physics', 'chemistry', 'biology', 'science', 'research'],
        'Music': ['music', 'song', 'guitar', 'piano', 'vocal'],
        'Gaming': ['game', 'gaming', 'playstation', 'xbox', 'nintendo']
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        for (const keyword of keywords) {
            if (allText.includes(keyword)) {
                topics.push(topic);
                break;
            }
        }
    }
    
    return topics.length > 0 ? topics : ['Learning'];
}

// Generate roadmap
async function generateRoadmap() {
    const container = document.getElementById('roadmapContent');
    const btn = document.getElementById('generateRoadmapBtn');
    
    if (!container) return;
    
    btn.disabled = true;
    btn.textContent = '✨ Generating...';
    container.innerHTML = '<div class="loader"></div><p style="text-align:center; margin-top:20px;">AI is creating your personalized roadmap...</p>';
    
    // Get watch history
    const watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    
    if (watchHistory.length === 0 && savedSummaries.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <span style="font-size: 48px; display: block; margin-bottom: 16px;">📚</span>
            <h3>No videos yet</h3>
            <p>Watch some videos first to generate a personalized roadmap!</p>
            <button onclick="location.href='index.html'" class="primary-btn" style="margin-top: 20px;">Browse Videos →</button>
        </div>`;
        btn.disabled = false;
        btn.textContent = '✨ Generate My Roadmap';
        return;
    }
    
    // Extract topics
    const topics = getLearningTopics();
    const videoTitles = [...watchHistory, ...savedSummaries].slice(0, 10).map(v => v.title);
    
    // Simple prompt that's easier to parse
    const prompt = `You are a study advisor. Based on these video titles the user has watched:
    
${videoTitles.map((t, i) => `${i+1}. ${t}`).join('\n')}

Create a 4-step study roadmap. Use this EXACT format:

STEP 1: [Topic Name]
Why: [One sentence reason]
What to learn: • [Point 1] • [Point 2] • [Point 3]

STEP 2: [Topic Name]
Why: [One sentence reason]
What to learn: • [Point 1] • [Point 2] • [Point 3]

STEP 3: [Topic Name]
Why: [One sentence reason]
What to learn: • [Point 1] • [Point 2] • [Point 3]

STEP 4: [Topic Name]
Why: [One sentence reason]
What to learn: • [Point 1] • [Point 2] • [Point 3]

Keep it practical and helpful.`;
    
    const result = await callGemini(prompt);
    
    if (result.startsWith('⚠️')) {
        container.innerHTML = `<div class="empty-state">
            <span style="font-size: 48px; display: block; margin-bottom: 16px;">⚠️</span>
            <h3>Something went wrong</h3>
            <p>${result}</p>
            <button onclick="generateRoadmap()" class="primary-btn" style="margin-top: 20px;">Try Again →</button>
        </div>`;
        btn.disabled = false;
        btn.textContent = '✨ Generate My Roadmap';
        return;
    }
    
    displayRoadmap(result, topics);
    
    btn.disabled = false;
    btn.textContent = '✨ Generate My Roadmap';
}

// Display roadmap
function displayRoadmap(roadmapText, topics) {
    const container = document.getElementById('roadmapContent');
    
    // Parse the roadmap text
    const steps = [];
    const stepRegex = /STEP (\d+):\s*([^\n]+)\nWhy:\s*([^\n]+)\nWhat to learn:\s*([\s\S]*?)(?=STEP \d+|$)/gi;
    
    let match;
    while ((match = stepRegex.exec(roadmapText)) !== null) {
        steps.push({
            number: match[1],
            title: match[2].trim(),
            reason: match[3].trim(),
            points: match[4].trim().split('•').filter(p => p.trim().length > 0).map(p => p.trim())
        });
    }
    
    // If regex failed, try fallback parsing
    if (steps.length === 0) {
        const lines = roadmapText.split('\n');
        let currentStep = null;
        
        for (const line of lines) {
            if (line.match(/^\d+\./)) {
                if (currentStep) steps.push(currentStep);
                currentStep = { title: line.replace(/^\d+\.\s*/, ''), reason: '', points: [] };
            } else if (currentStep && line.toLowerCase().includes('why')) {
                currentStep.reason = line.replace(/why:/i, '').trim();
            } else if (currentStep && line.trim().startsWith('•')) {
                currentStep.points.push(line.trim());
            }
        }
        if (currentStep) steps.push(currentStep);
    }
    
    if (steps.length === 0) {
        // Fallback: show topics-based roadmap
        container.innerHTML = `<div class="empty-state">
            <h3>📚 Based on your interests</h3>
            <p>We detected you're interested in: <strong>${topics.join(', ')}</strong></p>
            <p>Continue watching videos on these topics to get a detailed roadmap!</p>
            <button onclick="location.href='index.html'" class="primary-btn" style="margin-top: 20px;">Continue Learning →</button>
        </div>`;
        return;
    }
    
    // Display roadmap
    container.innerHTML = `
        <div class="roadmap-intro">
            <p>🎯 Based on your learning history, here's your personalized study path:</p>
        </div>
        ${steps.map((step, index) => `
            <div class="roadmap-node" style="animation-delay: ${index * 0.1}s">
                <div class="roadmap-marker">
                    <div class="roadmap-icon">${step.number || index + 1}</div>
                    ${index < steps.length - 1 ? '<div class="roadmap-line"></div>' : ''}
                </div>
                <div class="roadmap-card">
                    <h3>📘 ${escapeHtml(step.title)}</h3>
                    <div class="reason">🎯 ${escapeHtml(step.reason || 'Recommended for your learning path')}</div>
                    <div class="description">
                        ${step.points.map(p => `• ${escapeHtml(p)}`).join('<br>')}
                    </div>
                    <button class="action-btn" onclick="searchVideo('${encodeURIComponent(step.title)}')">🔍 Find Videos →</button>
                </div>
            </div>
        `).join('')}
    `;
}

function searchVideo(topic) {
    localStorage.setItem('searchTopic', topic);
    window.location.href = 'index.html';
}

function initDarkMode() {
    const themeBtn = document.getElementById('darkModeToggle');
    if (!themeBtn) return;
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        themeBtn.textContent = '☀️ Light';
    }
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('darkMode', isDark);
        themeBtn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    const btn = document.getElementById('generateRoadmapBtn');
    if (btn) {
        btn.addEventListener('click', generateRoadmap);
    }
    
    // Auto-generate if there are videos
    const watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    if (watchHistory.length > 0) {
        setTimeout(() => generateRoadmap(), 500);
    }
});
