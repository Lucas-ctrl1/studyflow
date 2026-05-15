// ===== MULTI-VIDEO COMPARISON =====

let selectedVideos = [null, null, null];
let currentSelectSlot = null;

function loadVideoList() {
    const watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    
    const allVideos = [...watchHistory, ...savedSummaries];
    const uniqueVideos = [];
    const seen = new Set();
    
    for (const video of allVideos) {
        if (!seen.has(video.id)) {
            seen.add(video.id);
            uniqueVideos.push(video);
        }
    }
    
    return uniqueVideos;
}

function showVideoSelector(slotIndex) {
    currentSelectSlot = slotIndex;
    const videos = loadVideoList();
    const modal = document.getElementById('videoSelectionModal');
    const listContainer = document.getElementById('videoSelectionList');
    
    if (videos.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No videos found. Watch some first!</div>';
    } else {
        listContainer.innerHTML = videos.map(video => `
            <div class="selection-item" data-id="${video.id}" data-title="${escapeHtml(video.title)}">
                <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="">
                <div>
                    <strong>${escapeHtml(video.title.substring(0, 50))}</strong><br>
                    <small>${video.timestamp ? new Date(video.timestamp).toLocaleDateString() : 'Saved'}</small>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.selection-item').forEach(item => {
            item.addEventListener('click', () => {
                selectVideo(currentSelectSlot, item.dataset.id, item.dataset.title);
                modal.style.display = 'none';
            });
        });
    }
    
    modal.style.display = 'flex';
}

function selectVideo(slot, videoId, videoTitle) {
    selectedVideos[slot] = { id: videoId, title: videoTitle, summary: getSummaryForVideo(videoId) };
    updateSelectCard(slot);
    renderComparison();
}

function getSummaryForVideo(videoId) {
    const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    const saved = savedSummaries.find(s => s.videoId === videoId);
    return saved ? saved.summary : null;
}

function updateSelectCard(slot) {
    const card = document.getElementById(`selectSlot${slot + 1}`);
    const video = selectedVideos[slot];
    
    if (video) {
        card.innerHTML = `
            <div class="video-info">
                <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="">
                <div>
                    <h4>${escapeHtml(video.title.substring(0, 50))}</h4>
                    <p>${video.summary ? '✓ Summary available' : '⚠️ No summary yet'}</p>
                </div>
            </div>
            <button class="remove-video" onclick="removeVideo(${slot})">✕</button>
        `;
        card.classList.add('filled');
    } else {
        card.innerHTML = '<div class="select-placeholder">📹 Select Video</div>';
        card.classList.remove('filled');
    }
}

function removeVideo(slot) {
    selectedVideos[slot] = null;
    updateSelectCard(slot);
    renderComparison();
}

function renderComparison() {
    const validVideos = selectedVideos.filter(v => v !== null);
    const comparisonView = document.getElementById('comparisonView');
    
    if (validVideos.length < 2) {
        comparisonView.style.display = 'none';
        return;
    }
    
    comparisonView.style.display = 'block';
    const grid = document.getElementById('comparisonGrid');
    
    grid.innerHTML = validVideos.map(video => `
        <div class="comparison-card">
            <h3>${escapeHtml(video.title.substring(0, 40))}</h3>
            <div class="summary">
                ${video.summary ? escapeHtml(video.summary.substring(0, 300)) + '...' : '<em>No summary available. Generate one in the player page.</em>'}
            </div>
        </div>
    `).join('');
}

async function generateAnalysis() {
    const validVideos = selectedVideos.filter(v => v !== null);
    if (validVideos.length < 2) {
        showToast('Select at least 2 videos to compare');
        return;
    }
    
    const analysisDiv = document.getElementById('aiAnalysis');
    analysisDiv.innerHTML = '<div class="loader"></div>';
    
    const prompt = `Compare these ${validVideos.length} videos:

${validVideos.map((v, i) => `${i + 1}. "${v.title}"\nSummary: ${v.summary || 'No summary'}`).join('\n\n')}

Provide:
1. Common themes (3 bullet points)
2. Key differences (3 bullet points)
3. Which video is best for what purpose
4. Recommendation for the user

Use **bold** for key terms.`;

    const result = await callGemini(prompt);
    analysisDiv.innerHTML = formatAnalysis(result);
}

function formatAnalysis(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

async function callGemini(prompt) {
    
    const GEMINI_API_KEY = window.CONFIG?.GEMINI_API_KEY || '';

    const MODEL_NAME = 'models/gemini-2.5-flash-lite';
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt.substring(0, 8000) }]
                    }]
                })
            }
        );
        
        const data = await response.json();
        if (data.error) return `⚠️ Error: ${data.error.message}`;
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        return `⚠️ Network error: ${err.message}`;
    }
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

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
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

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    
    for (let i = 0; i < 3; i++) {
        document.getElementById(`selectSlot${i + 1}`)?.addEventListener('click', () => showVideoSelector(i));
    }
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('videoSelectionModal').style.display = 'none';
        });
    });
    
    document.getElementById('generateAnalysisBtn')?.addEventListener('click', generateAnalysis);
    
    window.removeVideo = removeVideo;
    window.selectVideo = selectVideo;
});
