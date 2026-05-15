// ===== STUDYFLOW — APP.JS (Premium Features) =====

// ===== 1. SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ SW registered:', reg.scope))
            .catch(err => console.warn('SW failed:', err));
    });
}

// ===== 2. PAGE TRANSITION ANIMATIONS =====
(function initPageTransitions() {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'pageTransitionOverlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: linear-gradient(135deg, #7c6af7, #00d4c8);
        opacity: 0; pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1);
    `;
    document.body.appendChild(overlay);

    // Fade in on load
    requestAnimationFrame(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    });

    // Intercept all internal nav links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;

        e.preventDefault();
        overlay.style.opacity = '0.85';
        overlay.style.pointerEvents = 'all';
        setTimeout(() => {
            window.location.href = href;
        }, 280);
    });
})();

// ===== 3. SKELETON LOADERS =====
function showSkeletons(containerId, count = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Array(count).fill(`
        <div class="skeleton-card">
            <div class="skeleton skeleton-thumb"></div>
            <div class="skeleton-info">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-sub"></div>
            </div>
        </div>
    `).join('');
}

function showSkeletonList(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Array(count).fill(`
        <div class="skeleton-list-item">
            <div class="skeleton skeleton-list-thumb"></div>
            <div class="skeleton-list-info">
                <div class="skeleton skeleton-list-title"></div>
                <div class="skeleton skeleton-list-sub"></div>
            </div>
        </div>
    `).join('');
}

// Expose globally
window.showSkeletons = showSkeletons;
window.showSkeletonList = showSkeletonList;

// ===== 4. SEARCH HISTORY DROPDOWN =====
(function initSearchHistory() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const MAX_HISTORY = 8;

    function getHistory() {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    }

    function saveToHistory(query) {
        if (!query.trim()) return;
        let history = getHistory().filter(q => q !== query);
        history.unshift(query);
        if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
        localStorage.setItem('searchHistory', JSON.stringify(history));
    }

    function buildDropdown() {
        let dropdown = document.getElementById('searchDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'searchDropdown';
            dropdown.className = 'search-dropdown';
            searchInput.parentElement.style.position = 'relative';
            searchInput.parentElement.appendChild(dropdown);
        }
        return dropdown;
    }

    function renderDropdown(query) {
        const dropdown = buildDropdown();
        const history = getHistory();
        const filtered = query
            ? history.filter(q => q.toLowerCase().includes(query.toLowerCase()))
            : history;

        if (!filtered.length) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = `
            <div class="dropdown-header">
                <span>${query ? '🔍 Suggestions' : '🕐 Recent Searches'}</span>
                ${!query ? '<button onclick="clearSearchHistory()" class="clear-history-btn">Clear</button>' : ''}
            </div>
            ${filtered.map(q => `
                <div class="dropdown-item" data-query="${escapeHtmlBasic(q)}">
                    <span class="dropdown-icon">${query ? '🔍' : '🕐'}</span>
                    <span>${escapeHtmlBasic(q)}</span>
                    <button class="remove-item" onclick="removeSearchItem(event, '${escapeHtmlBasic(q)}')">✕</button>
                </div>
            `).join('')}
        `;
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-item')) return;
                searchInput.value = item.dataset.query;
                dropdown.style.display = 'none';
                // Trigger search
                const searchBtn = document.getElementById('searchBtn');
                if (searchBtn) searchBtn.click();
            });
        });
    }

    searchInput.addEventListener('focus', () => renderDropdown(searchInput.value));
    searchInput.addEventListener('input', () => renderDropdown(searchInput.value));

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchDropdown') && e.target !== searchInput) {
            const dd = document.getElementById('searchDropdown');
            if (dd) dd.style.display = 'none';
        }
    });

    // Hook into search on form submit/button click
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        const originalClick = searchBtn.onclick;
        searchBtn.addEventListener('click', () => {
            const q = searchInput.value.trim();
            if (q) saveToHistory(q);
            const dd = document.getElementById('searchDropdown');
            if (dd) dd.style.display = 'none';
        });
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (q) saveToHistory(q);
            const dd = document.getElementById('searchDropdown');
            if (dd) dd.style.display = 'none';
        }
    });

    // Expose clear/remove for inline handlers
    window.clearSearchHistory = function() {
        localStorage.removeItem('searchHistory');
        const dd = document.getElementById('searchDropdown');
        if (dd) dd.style.display = 'none';
    };

    window.removeSearchItem = function(e, query) {
        e.stopPropagation();
        const history = getHistory().filter(q => q !== query);
        localStorage.setItem('searchHistory', JSON.stringify(history));
        renderDropdown(searchInput.value);
    };
})();

// ===== 5. WATCH PROGRESS TRACKING =====
window.saveWatchProgress = function(videoId, percent) {
    const progress = JSON.parse(localStorage.getItem('watchProgress') || '{}');
    progress[videoId] = Math.min(100, Math.round(percent));
    localStorage.setItem('watchProgress', JSON.stringify(progress));
};

window.getWatchProgress = function(videoId) {
    const progress = JSON.parse(localStorage.getItem('watchProgress') || '{}');
    return progress[videoId] || 0;
};

// Inject progress bars into video cards after render
window.injectProgressBars = function() {
    document.querySelectorAll('.video-card[data-id]').forEach(card => {
        const id = card.dataset.id;
        const pct = getWatchProgress(id);
        if (pct > 0 && !card.querySelector('.progress-bar-wrap')) {
            const bar = document.createElement('div');
            bar.className = 'progress-bar-wrap';
            bar.innerHTML = `<div class="progress-bar-fill" style="width:${pct}%"></div>`;
            card.appendChild(bar);

            // Add badge if completed
            if (pct >= 90) {
                const badge = document.createElement('div');
                badge.className = 'watched-badge';
                badge.textContent = '✓ Watched';
                card.appendChild(badge);
            }
        }
    });
};

// ===== 6. QUIZ SCORE TRACKING =====
window.saveQuizScore = function(videoId, score, total) {
    const scores = JSON.parse(localStorage.getItem('quizScores') || '[]');
    scores.unshift({
        videoId,
        score,
        total,
        percent: Math.round((score / total) * 100),
        date: new Date().toISOString()
    });
    if (scores.length > 100) scores.pop();
    localStorage.setItem('quizScores', JSON.stringify(scores));
    updateQuizAverage();
};

window.getQuizAverage = function() {
    const scores = JSON.parse(localStorage.getItem('quizScores') || '[]');
    if (!scores.length) return 0;
    const avg = scores.reduce((sum, s) => sum + s.percent, 0) / scores.length;
    return Math.round(avg);
};

function updateQuizAverage() {
    const el = document.getElementById('quizScore');
    if (el) el.textContent = getQuizAverage() + '%';
}

// Update on home page load
document.addEventListener('DOMContentLoaded', updateQuizAverage);

// ===== 7. KEYBOARD SHORTCUTS =====
(function initKeyboardShortcuts() {
    // Show shortcut hint on first visit
    if (!localStorage.getItem('shortcutsShown')) {
        setTimeout(() => {
            showGlobalToast('⌨️ Press ? to see keyboard shortcuts');
            localStorage.setItem('shortcutsShown', 'true');
        }, 2000);
    }

    const shortcuts = {
        '/':  () => { const s = document.getElementById('searchInput'); if (s) { s.focus(); s.select(); } },
        'h':  () => window.location.href = 'index.html',
        'l':  () => window.location.href = 'library.html',
        'p':  () => window.location.href = 'player.html',
        'c':  () => window.location.href = 'chat.html',
        'r':  () => window.location.href = 'roadmap.html',
        'v':  () => window.location.href = 'compare.html',
        'd':  () => document.getElementById('darkModeToggle')?.click(),
        '?':  () => showShortcutsModal(),
        'Escape': () => {
            hideShortcutsModal();
            const dd = document.getElementById('searchDropdown');
            if (dd) dd.style.display = 'none';
        }
    };

    document.addEventListener('keydown', (e) => {
        // Ignore when typing in inputs
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
            if (e.key === 'Escape') e.target.blur();
            return;
        }
        const handler = shortcuts[e.key];
        if (handler) { e.preventDefault(); handler(); }
    });

    function showShortcutsModal() {
        let modal = document.getElementById('shortcutsModal');
        if (modal) { modal.style.display = 'flex'; return; }

        modal = document.createElement('div');
        modal.id = 'shortcutsModal';
        modal.className = 'shortcuts-modal';
        modal.innerHTML = `
            <div class="shortcuts-content">
                <div class="shortcuts-header">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <button onclick="document.getElementById('shortcutsModal').style.display='none'">✕</button>
                </div>
                <div class="shortcuts-grid">
                    <div class="shortcut-item"><kbd>/</kbd><span>Focus Search</span></div>
                    <div class="shortcut-item"><kbd>H</kbd><span>Home</span></div>
                    <div class="shortcut-item"><kbd>L</kbd><span>Library</span></div>
                    <div class="shortcut-item"><kbd>P</kbd><span>Player</span></div>
                    <div class="shortcut-item"><kbd>C</kbd><span>AI Chat</span></div>
                    <div class="shortcut-item"><kbd>R</kbd><span>Roadmap</span></div>
                    <div class="shortcut-item"><kbd>V</kbd><span>Compare</span></div>
                    <div class="shortcut-item"><kbd>D</kbd><span>Toggle Dark/Light</span></div>
                    <div class="shortcut-item"><kbd>?</kbd><span>Show Shortcuts</span></div>
                    <div class="shortcut-item"><kbd>Esc</kbd><span>Close / Blur</span></div>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        document.body.appendChild(modal);
    }

    function hideShortcutsModal() {
        const modal = document.getElementById('shortcutsModal');
        if (modal) modal.style.display = 'none';
    }
})();

// ===== 8. GLOBAL TOAST (fallback) =====
function showGlobalToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== 9. INSTALL PROMPT (Add to Home Screen) =====
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button if it exists
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') showGlobalToast('🎉 StudyFlow installed!');
            deferredPrompt = null;
            installBtn.style.display = 'none';
        });
    }
});

// ===== UTILITY =====
function escapeHtmlBasic(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}
