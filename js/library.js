// ===== LIBRARY LOGIC - ROBUST VERSION =====

// Wait for both DOM and CSS to be ready
function ready(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
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
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
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

function updateStats() {
    const saved = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    const summaryCount = document.getElementById('summaryCount');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (summaryCount) {
        summaryCount.textContent = saved.length;
        // Force a repaint
        summaryCount.style.display = 'inline';
    }
    if (clearAllBtn) {
        clearAllBtn.style.display = saved.length > 0 ? 'flex' : 'none';
    }
    
    console.log('📊 Stats updated:', saved.length, 'summaries');
}

function loadLibrary() {
    console.log('📚 Loading library...');
    
    const saved = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    const container = document.getElementById('libraryList');
    
    if (!container) {
        console.error('❌ Library container not found');
        return;
    }
    
    updateStats();
    
    if (!saved.length) {
        container.innerHTML = '<div class="empty-state">📚 No saved summaries yet. Generate one from the player page →</div>';
        console.log('📚 No summaries to display');
        return;
    }
    
    console.log('📚 Displaying', saved.length, 'summaries');
    
    container.innerHTML = saved.map((item, index) => `
        <div class="library-card" data-id="${item.videoId}" data-index="${index}">
            <h3>${escapeHtml(item.title)}</h3>
            <div class="date">📅 ${new Date(item.date).toLocaleDateString()}</div>
            <div class="preview">${escapeHtml(item.summary.substring(0, 150))}${item.summary.length > 150 ? '...' : ''}</div>
            <div class="library-actions">
                <button class="watch-again" data-id="${item.videoId}" data-title="${escapeHtml(item.title)}">▶️ Watch Again</button>
                <button class="delete-summary" data-index="${index}">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.watch-again').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const title = btn.dataset.title;
            localStorage.setItem('currentVideoId', id);
            localStorage.setItem('currentVideoTitle', title);
            window.location.href = 'player.html';
        });
    });
    
    document.querySelectorAll('.delete-summary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            deleteSummary(index);
        });
    });
}

function deleteSummary(index) {
    const saved = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    
    if (index >= 0 && index < saved.length) {
        const removed = saved.splice(index, 1)[0];
        localStorage.setItem('savedSummaries', JSON.stringify(saved));
        showToast(`🗑️ Deleted: ${removed.title.substring(0, 40)}`);
        loadLibrary(); // Refresh the display
    }
}

function clearAllSummaries() {
    if (confirm('⚠️ Are you sure you want to delete ALL saved summaries? This cannot be undone.')) {
        localStorage.setItem('savedSummaries', '[]');
        showToast('🗑️ All summaries deleted');
        loadLibrary();
    }
}

// Initialize when ready
ready(() => {
    console.log('🚀 Library page initialized');
    initDarkMode();
    loadLibrary();
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllSummaries);
    }
});

// Also reload when localStorage changes (in case another tab updates)
window.addEventListener('storage', (e) => {
    if (e.key === 'savedSummaries') {
        console.log('🔄 Storage changed, reloading library');
        loadLibrary();
    }
});