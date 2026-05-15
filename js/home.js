// ===== HOMEPAGE LOGIC =====
let currentRegion = 'US';
let watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
let savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
let youtubeKey = CONFIG.YOUTUBE_API_KEY;

document.addEventListener('DOMContentLoaded', () => {
    loadTrending('US');
    updateRecentVideos();
    updateStats();
    initHomeEvents();
});

function updateStats() {
    const videoCount = document.getElementById('videoCount');
    const summaryCount = document.getElementById('summaryCount');
    const quizScore = document.getElementById('quizScore');

    if (videoCount) videoCount.textContent = watchHistory.length;
    if (summaryCount) summaryCount.textContent = savedSummaries.length;

    // Real quiz average from app.js
    if (quizScore && typeof getQuizAverage === 'function') {
        const avg = getQuizAverage();
        quizScore.textContent = avg > 0 ? avg + '%' : '—';
    }
}

function initHomeEvents() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const voiceBtn = document.getElementById('voiceBtn');

    if (searchBtn) searchBtn.addEventListener('click', searchVideos);
    if (searchInput) searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchVideos();
    });
    if (voiceBtn) voiceBtn.addEventListener('click', startVoiceSearch);

    const continueBtn = document.getElementById('continueBtn');
    const dailyBtn = document.getElementById('dailyBtn');
    const reviewBtn = document.getElementById('reviewBtn');
    const seeAllHistory = document.getElementById('seeAllHistory');

    if (continueBtn) continueBtn.addEventListener('click', continueWatching);
    if (dailyBtn) dailyBtn.addEventListener('click', () => showToast('Daily quiz coming soon 🎯'));
    if (reviewBtn) reviewBtn.addEventListener('click', () => showToast('Smart review coming soon 🔄'));
    if (seeAllHistory) seeAllHistory.addEventListener('click', () => window.location.href = 'library.html');

    const directLinkBtn = document.getElementById('directLinkBtn');
    const directLinkInput = document.getElementById('directLinkInput');

    if (directLinkBtn) directLinkBtn.addEventListener('click', handleDirectLink);
    if (directLinkInput) directLinkInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDirectLink();
    });

    document.querySelectorAll('.region').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.region').forEach(r => r.classList.remove('active'));
            btn.classList.add('active');
            currentRegion = btn.dataset.region;
            loadTrending(currentRegion);
        });
    });

    document.querySelectorAll('.filter').forEach(filter => {
        filter.addEventListener('click', () => {
            document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            const filterValue = filter.dataset.filter;
            if (filterValue === 'all') loadTrending(currentRegion);
            else filterByCategory(filterValue);
        });
    });
}

// ===== OPEN VIDEO =====
function openVideo(videoId, videoTitle) {
    watchHistory = watchHistory.filter(v => v.id !== videoId);
    watchHistory.unshift({
        id: videoId,
        title: videoTitle,
        timestamp: new Date().toISOString(),
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    });
    if (watchHistory.length > 20) watchHistory.pop();
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    localStorage.setItem('currentVideoId', videoId);
    localStorage.setItem('currentVideoTitle', videoTitle);
    updateRecentVideos();
    updateStats();
    window.location.href = 'player.html';
}

// ===== DIRECT LINK =====
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?#]+)/,
        /youtube\.com\/shorts\/([^&?#]+)/,
        /youtube\.com\/live\/([^&?#]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

async function handleDirectLink() {
    const input = document.getElementById('directLinkInput');
    const url = input.value.trim();
    if (!url) { showToast('📎 Paste a YouTube link'); return; }
    const videoId = extractVideoId(url);
    if (!videoId) { showToast('❌ Invalid YouTube link'); return; }
    showToast('📥 Processing video...');
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`);
        const data = await response.json();
        if (data.error || !data.items || !data.items.length) { showToast('❌ Video not found or private'); return; }
        const videoTitle = data.items[0].snippet.title;
        localStorage.setItem('currentVideoId', videoId);
        localStorage.setItem('currentVideoTitle', videoTitle);
        window.location.href = 'player.html';
    } catch (err) { showToast('❌ Error fetching video'); }
}

// ===== FILTER BY CATEGORY =====
async function filterByCategory(category) {
    const grid = document.getElementById('videoGrid');
    if (!grid) return;
    if (window.showSkeletons) showSkeletons('videoGrid', 8);

    const searchTerms = {
        tutorial: 'tutorial how to',
        lecture: 'lecture course',
        coding: 'programming coding',
        science: 'science physics chemistry',
        music: 'music song'
    };
    const query = searchTerms[category] || '';
    if (!query) return loadTrending(currentRegion);

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${youtubeKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        renderVideoCards(grid, data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumb: item.snippet.thumbnails.medium.url
        })));
        showToast(`Showing ${category} videos`);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state">❌ ${err.message}</div>`;
    }
}

// ===== TRENDING VIDEOS =====
async function loadTrending(region) {
    const grid = document.getElementById('videoGrid');
    if (!grid) return;
    if (window.showSkeletons) showSkeletons('videoGrid', 8);

    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=12&regionCode=${region}&key=${youtubeKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        renderVideoCards(grid, data.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumb: item.snippet.thumbnails.medium.url
        })));
    } catch (err) {
        grid.innerHTML = `<div class="empty-state">❌ ${err.message}</div>`;
    }
}

// ===== SEARCH VIDEOS =====
async function searchVideos() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return loadTrending(currentRegion);
    const grid = document.getElementById('videoGrid');
    if (!grid) return;
    if (window.showSkeletons) showSkeletons('videoGrid', 8);

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${youtubeKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        renderVideoCards(grid, data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumb: item.snippet.thumbnails.medium.url
        })));
        showToast(`Found ${data.items.length} results`);
    } catch (err) {
        grid.innerHTML = `<div class="empty-state">❌ ${err.message}</div>`;
    }
}

// ===== RENDER VIDEO CARDS (with progress bars) =====
function renderVideoCards(grid, videos) {
    grid.innerHTML = videos.map(v => `
        <div class="video-card" data-id="${v.id}" data-title="${escapeHtml(v.title)}" style="position:relative;">
            <img src="${v.thumb}" loading="lazy" alt="">
            <div class="info">
                <h4>${escapeHtml(v.title)}</h4>
                <p>${escapeHtml(v.channel)}</p>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => openVideo(card.dataset.id, card.dataset.title));
    });

    // Inject progress bars after render
    if (window.injectProgressBars) injectProgressBars();
}

// ===== RECENT VIDEOS =====
function updateRecentVideos() {
    const container = document.getElementById('recentList');
    if (!container) return;
    if (!watchHistory.length) {
        container.innerHTML = '<div class="empty-state">No videos yet. Start watching →</div>';
        return;
    }
    container.innerHTML = watchHistory.slice(0, 5).map(video => `
        <div class="recent-item" data-id="${video.id}">
            <img src="${video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}" alt="">
            <div class="info">
                <h4>${escapeHtml(video.title)}</h4>
                <p>${new Date(video.timestamp).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.recent-item').forEach(item => {
        item.addEventListener('click', () => openVideo(item.dataset.id, item.querySelector('h4')?.innerText || ''));
    });
}

// ===== CONTINUE WATCHING =====
function continueWatching() {
    if (watchHistory.length) {
        const last = watchHistory[0];
        openVideo(last.id, last.title);
    } else {
        showToast('No videos in history');
    }
}

// ===== VOICE SEARCH =====
function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('Voice not supported on this browser');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) voiceBtn.classList.add('listening');
    showToast('🎙️ Listening...');
    recognition.start();
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = text;
        if (voiceBtn) voiceBtn.classList.remove('listening');
        searchVideos();
    };
    recognition.onerror = () => {
        if (voiceBtn) voiceBtn.classList.remove('listening');
        showToast('Voice failed. Please type.');
    };
    recognition.onend = () => {
        if (voiceBtn) voiceBtn.classList.remove('listening');
    };
}

// ===== UTILITIES =====
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}
