// ===== STUDYFLOW NOTES SYSTEM =====

function initNotes() {
    const notesPanel = document.getElementById('notesPanel');
    if (!notesPanel) return;

    const videoId = localStorage.getItem('currentVideoId');
    const notes = loadNotes(videoId);
    renderNotes(notes, videoId);

    document.getElementById('addNoteBtn')?.addEventListener('click', () => {
        const input = document.getElementById('noteInput');
        const text = input?.value.trim();
        if (!text) return;
        saveNote(videoId, text);
        input.value = '';
        renderNotes(loadNotes(videoId), videoId);
        showToast('📝 Note saved!');
    });

    document.getElementById('noteInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('addNoteBtn')?.click();
        }
    });

    document.getElementById('exportNotesBtn')?.addEventListener('click', () => exportNotes(videoId));
}

function loadNotes(videoId) {
    const all = JSON.parse(localStorage.getItem('videoNotes') || '{}');
    return all[videoId] || [];
}

function saveNote(videoId, text) {
    const all = JSON.parse(localStorage.getItem('videoNotes') || '{}');
    if (!all[videoId]) all[videoId] = [];
    all[videoId].unshift({
        id: Date.now(),
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem('videoNotes', JSON.stringify(all));
}

function deleteNote(videoId, noteId) {
    const all = JSON.parse(localStorage.getItem('videoNotes') || '{}');
    if (all[videoId]) {
        all[videoId] = all[videoId].filter(n => n.id !== noteId);
        localStorage.setItem('videoNotes', JSON.stringify(all));
    }
}

function renderNotes(notes, videoId) {
    const container = document.getElementById('notesList');
    if (!container) return;

    if (!notes.length) {
        container.innerHTML = '<p class="notes-empty">No notes yet. Add your first note above!</p>';
        return;
    }

    container.innerHTML = notes.map(note => `
        <div class="note-item" data-id="${note.id}">
            <div class="note-text">${escapeHtml(note.text)}</div>
            <div class="note-meta">
                <span class="note-time">🕐 ${note.time} · ${note.date}</span>
                <button class="note-delete" onclick="deleteNoteAndRefresh('${videoId}', ${note.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function deleteNoteAndRefresh(videoId, noteId) {
    deleteNote(videoId, noteId);
    renderNotes(loadNotes(videoId), videoId);
    showToast('🗑️ Note deleted');
}

function exportNotes(videoId) {
    const notes = loadNotes(videoId);
    const title = localStorage.getItem('currentVideoTitle') || 'Video';

    if (!notes.length) {
        showToast('No notes to export');
        return;
    }

    let text = `StudyFlow Notes\nVideo: ${title}\nExported: ${new Date().toLocaleString()}\n\n`;
    text += notes.map((n, i) => `[${i + 1}] ${n.date} ${n.time}\n${n.text}`).join('\n\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `notes_${title.substring(0, 25).replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    showToast('📎 Notes exported!');
}

// Called from player page — safe fallback
if (typeof escapeHtml === 'undefined') {
    window.escapeHtml = function(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    };
}
