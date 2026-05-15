// ===== COMPLETE PLAYER.JS - WITH DARK MODE =====
const GEMINI_API_KEY = 'AIzaSyC8oS6Hqx537nANhWKkGNXnCeFlHSv01kM';
const MODEL_NAME = 'models/gemini-2.5-flash-lite';

let currentVideoId = '';
let currentVideoTitle = '';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadVideo();
    initPlayerEvents();
    initDarkMode();  // ✅ ADD THIS
});

function loadVideo() {
    currentVideoId = localStorage.getItem('currentVideoId');
    currentVideoTitle = localStorage.getItem('currentVideoTitle');
    
    if (currentVideoId) {
        document.getElementById('videoFrame').src = `https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1`;
        document.getElementById('videoTitle').textContent = currentVideoTitle || 'Video';
        
        // Load saved summary if exists
        loadSavedSummary(currentVideoId);
    } else {
        document.getElementById('videoTitle').textContent = 'No video selected';
    }
}

function loadSavedSummary(videoId) {
    const saved = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    const savedItem = saved.find(item => item.videoId === videoId);
    
    if (savedItem && savedItem.summary) {
        const output = document.getElementById('summaryOutput');
        output.innerHTML = formatOutput(savedItem.summary);
        showToast('📚 Loaded saved summary');
    }
}

function initPlayerEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}Tab`).classList.add('active');
        });
    });
    
    document.getElementById('summarizeBtn')?.addEventListener('click', generateSummary);
    document.getElementById('askBtn')?.addEventListener('click', askQuestion);
    document.getElementById('quizBtn')?.addEventListener('click', generateQuiz);
    document.getElementById('copyLinkBtn')?.addEventListener('click', copyVideoLink);
    document.getElementById('saveBtn')?.addEventListener('click', saveSummary);
    document.getElementById('questionInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askQuestion();
    });
    
    document.addEventListener('click', (e) => {
        if (e.target.classList && e.target.classList.contains('timestamp')) {
            jumpToTimestamp(e.target.dataset.time);
        }
    });
}

// ===== DARK MODE FUNCTION =====
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
        
        // Force redraw of knowledge web if exists
        if (typeof updateKnowledgeWeb === 'function') {
            setTimeout(updateKnowledgeWeb, 50);
        }
    });
}

// ===== GEMINI API CALL =====
async function callGemini(prompt) {
    const trimmedPrompt = prompt.length > 8000 ? prompt.substring(0, 8000) : prompt;
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
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
                return '⏳ Rate limit. Wait 10 seconds.';
            }
            return `⚠️ ${data.error.message}`;
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        console.error('Network error:', err);
        return `⚠️ Network error: ${err.message}`;
    }
}

// ===== GET VIDEO DETAILS =====
async function getVideoDetails(videoId) {
    const YOUTUBE_KEY = 'AIzaSyBbc6gPuVxD5NVFYUc3fxFEOeSwgLUGqAg';
    
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_KEY}`);
        const data = await response.json();
        
        if (data.items && data.items[0]) {
            const snippet = data.items[0].snippet;
            return {
                title: snippet.title,
                channel: snippet.channelTitle,
                description: snippet.description || '',
                duration: parseDuration(data.items[0].contentDetails.duration)
            };
        }
    } catch (err) {
        console.error('Error:', err);
    }
    
    return { title: currentVideoTitle, channel: '', description: '', duration: 0 };
}

function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    return hours * 60 + minutes;
}

// ===== GET TRANSCRIPT =====
async function getTranscript(videoId) {
    try {
        const response = await fetch(`https://yewtu.be/api/v1/captions/${videoId}`);
        const data = await response.json();
        
        if (data.captions && data.captions.length > 0) {
            let caption = data.captions.find(c => c.language_code === 'en');
            if (!caption) caption = data.captions[0];
            
            if (caption && caption.url) {
                const captionResponse = await fetch(caption.url);
                const vttText = await captionResponse.text();
                return parseVTT(vttText);
            }
        }
        return null;
    } catch (err) {
        return null;
    }
}

function parseVTT(vttText) {
    const lines = vttText.split('\n');
    const textLines = [];
    
    for (const line of lines) {
        if (!line.includes('-->') && 
            !line.includes('WEBVTT') && 
            line.trim() !== '' && 
            !line.match(/^\d+$/)) {
            textLines.push(line.trim());
        }
    }
    
    return textLines.join(' ').substring(0, 6000);
}

// ===== AUTO-SAVE SUMMARY =====
function autoSaveSummary(summaryText, videoId, videoTitle) {
    if (!summaryText || summaryText.includes('Generating') || summaryText.includes('Getting') || summaryText.includes('⚠️')) {
        return;
    }
    
    let saved = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    const existingIndex = saved.findIndex(item => item.videoId === videoId);
    
    const newSummary = {
        videoId: videoId,
        title: videoTitle,
        summary: summaryText,
        date: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
        saved[existingIndex] = newSummary;
    } else {
        saved.unshift(newSummary);
    }
    
    if (saved.length > 50) saved.pop();
    localStorage.setItem('savedSummaries', JSON.stringify(saved));
}

// ===== GENERATE SUMMARY =====
async function generateSummary() {
    if (!currentVideoId) { showToast('No video loaded'); return; }
    
    const output = document.getElementById('summaryOutput');
    output.innerHTML = '<div class="loader-small"></div><p style="text-align:center">Getting video info...</p>';
    showToast('📝 Generating summary...');
    
    const videoDetails = await getVideoDetails(currentVideoId);
    const transcript = await getTranscript(currentVideoId);
    
    let prompt = '';
    
    if (transcript && transcript.length > 200) {
        prompt = `Summarize this YouTube video.

TITLE: ${videoDetails.title}
CHANNEL: ${videoDetails.channel}

TRANSCRIPT:
${transcript.substring(0, 5000)}

Use 5-7 bullet points with •. Use **bold** for key terms. Include timestamps if mentioned.`;
        showToast('✅ Using transcript');
    } else if (videoDetails.description && videoDetails.description.length > 200) {
        prompt = `Based on this video's title and description, provide a summary.

TITLE: ${videoDetails.title}
DESCRIPTION: ${videoDetails.description.substring(0, 1500)}

Use 5-7 bullet points with •. Use **bold** for key terms.`;
        showToast('📋 Using description');
    } else {
        prompt = `Based on the video title "${videoDetails.title}", provide an educational summary.

Use 5-7 bullet points with •. Use **bold** for key terms.`;
        showToast('📖 Using title');
    }
    
    output.innerHTML = '<div class="loader-small"></div><p style="text-align:center">Analyzing...</p>';
    
    const result = await callGemini(prompt);
    output.innerHTML = formatOutput(result);
    
    // Auto-save to library
    autoSaveSummary(result, currentVideoId, currentVideoTitle);
}

// ===== Q&A =====
async function askQuestion() {
    const question = document.getElementById('questionInput').value.trim();
    if (!question) { showToast('Enter a question'); return; }
    if (!currentVideoId) { showToast('No video loaded'); return; }
    
    const output = document.getElementById('qaOutput');
    output.innerHTML = '<div class="loader-small"></div><p style="text-align:center">Thinking...</p>';
    showToast('💭 Getting answer...');
    
    const videoDetails = await getVideoDetails(currentVideoId);
    const transcript = await getTranscript(currentVideoId);
    
    let prompt = '';
    
    if (transcript && transcript.length > 200) {
        prompt = `Video: "${videoDetails.title}"
Transcript: ${transcript.substring(0, 4000)}

Question: "${question}"

Instructions:
- Answer the question clearly and educationally
- ALWAYS include relevant timestamps in format [MM:SS] wherever applicable
- If the user asks about a specific time, focus your answer on that section
- Use **bold** for key terms
- Format timestamps like: at [1:24] or see [3:45]`;
    } else {
        prompt = `Video: "${videoDetails.title}"
Description: ${videoDetails.description.substring(0, 800)}

Question: "${question}"

Answer helpfully. If the question mentions a timestamp or time range, acknowledge it and answer based on what that section likely covers given the video title and description. Use **bold** for key terms.`;
    }
    
    const result = await callGemini(prompt);
    output.innerHTML = formatOutput(result);
    document.getElementById('questionInput').value = '';
}

// ===== GENERATE QUIZ =====
async function generateQuiz() {
    if (!currentVideoId) { showToast('No video loaded'); return; }
    
    const output = document.getElementById('quizOutput');
    output.innerHTML = '<div class="loader-small"></div><p style="text-align:center">Creating quiz...</p>';
    showToast('📝 Generating quiz...');
    
    const videoDetails = await getVideoDetails(currentVideoId);
    const transcript = await getTranscript(currentVideoId);
    
    let prompt = '';
    
    if (transcript && transcript.length > 200) {
        prompt = `Based on this transcript from "${videoDetails.title}", create 5 multiple-choice questions.

Transcript: ${transcript.substring(0, 4000)}

Format each:
**Q1:** question
A) option
B) option
C) option
D) option
**Answer:** letter`;
    } else {
        prompt = `Based on the title "${videoDetails.title}", create 5 multiple-choice questions.

Format each:
**Q1:** question
A) option
B) option
C) option
D) option
**Answer:** letter`;
    }
    
    const result = await callGemini(prompt);
    output.innerHTML = formatOutput(result);
}

// ===== SAVE SUMMARY (Manual) =====
function saveSummary() {
    const summaryText = document.getElementById('summaryOutput').innerText;
    if (!summaryText || summaryText.includes('Getting') || summaryText.includes('Analyzing') || summaryText.includes('Generating')) {
        showToast('Generate a summary first');
        return;
    }
    
    autoSaveSummary(summaryText, currentVideoId, currentVideoTitle);
    showToast('💾 Saved to library');
}

// ===== FORMAT OUTPUT =====
function formatOutput(text) {
    if (!text || text.includes('⚠️')) {
        return `<div class="error">${text || 'Error'}</div>`;
    }
    
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^• (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/(\b\d{1,2}:\d{2}\b)/g, '<span class="timestamp" data-time="$1">📍 $1</span>');
    html = html.replace(/\n/g, '<br>');
    
    return `<div class="formatted">${html}</div>`;
}

// ===== TIMESTAMP JUMP =====
function jumpToTimestamp(timeString) {
    const parts = timeString.split(':');
    let seconds = parts.length === 2 ? parseInt(parts[0])*60 + parseInt(parts[1]) : parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseInt(parts[2]);
    
    const iframe = document.getElementById('videoFrame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), '*');
        showToast(`⏱️ Jumped to ${timeString}`);
    }
}

// ===== UTILITIES =====
function copyVideoLink() {
    if (currentVideoId) {
        navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${currentVideoId}`);
        showToast('📋 Link copied');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}