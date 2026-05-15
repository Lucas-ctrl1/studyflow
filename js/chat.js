// ===== AI CHAT WITH VIDEO =====

let currentVideoId = null;
let currentVideoTitle = null;
let currentSummary = null;
let chatHistory = [];

// Load watch history for sidebar
function loadVideoList() {
    const watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    const container = document.getElementById('videoList');
    
    if (!container) return;
    
    // Merge both sources and deduplicate
    const allVideos = [...watchHistory, ...savedSummaries];
    const uniqueVideos = [];
    const seen = new Set();
    
    for (const video of allVideos) {
        if (!seen.has(video.id)) {
            seen.add(video.id);
            uniqueVideos.push(video);
        }
    }
    
    if (uniqueVideos.length === 0) {
        container.innerHTML = '<div class="empty-state">No videos yet. Watch something first →</div>';
        return;
    }
    
    container.innerHTML = uniqueVideos.map(video => `
        <div class="video-list-item" data-id="${video.id}" data-title="${escapeHtml(video.title)}">
            <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="">
            <div class="video-info">
                <div class="video-title">${escapeHtml(video.title.substring(0, 35))}${video.title.length > 35 ? '...' : ''}</div>
                <div class="video-date">${video.timestamp ? new Date(video.timestamp).toLocaleDateString() : 'Saved'}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.video-list-item').forEach(item => {
        item.addEventListener('click', () => selectVideo(item.dataset.id, item.dataset.title));
    });
}

// Select a video to chat about
async function selectVideo(videoId, videoTitle) {
    // Remove active class from all
    document.querySelectorAll('.video-list-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected
    const selected = document.querySelector(`.video-list-item[data-id="${videoId}"]`);
    if (selected) selected.classList.add('active');
    
    currentVideoId = videoId;
    currentVideoTitle = videoTitle;
    document.getElementById('selectedVideoTitle').textContent = videoTitle;
    
    // Load saved summary if exists
    const savedSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
    const saved = savedSummaries.find(s => s.videoId === videoId);
    currentSummary = saved ? saved.summary : null;
    
    // Add system message
    addSystemMessage(`You're now chatting about: "${videoTitle}". Ask me anything!`);
    
    // If no summary, offer to generate
    if (!currentSummary) {
        addAIMessage("I don't have a summary for this video yet. Would you like me to generate one for you? Just ask 'summarize this video' and I'll create one!");
    }
}

// Add user message to chat
function addUserMessage(text) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.innerHTML = `
        <div class="user-avatar">👤</div>
        <div class="message-bubble">${escapeHtml(text)}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatHistory.push({ role: 'user', content: text });
}

// Add AI message to chat
function addAIMessage(text) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    messageDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="message-bubble">${formatMessageText(text)}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatHistory.push({ role: 'assistant', content: text });
}

// Add system message
function addSystemMessage(text) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    messageDiv.innerHTML = `
        <div class="ai-avatar">ℹ️</div>
        <div class="message-bubble" style="background: var(--primary-light);">${escapeHtml(text)}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Format message text (bold, links, etc.)
function formatMessageText(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

// Show typing indicator
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="message-bubble">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// Call Gemini API
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

// Send message to AI
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    
    if (!question) return;
    if (!currentVideoId) {
        addSystemMessage('Please select a video first from the sidebar!');
        input.value = '';
        return;
    }
    
    addUserMessage(question);
    input.value = '';
    
    showTypingIndicator();
    
    // Build context from summary or video
    let context = currentSummary || `The user is asking about a video titled "${currentVideoTitle}" but no summary is available yet.`;
    
    const prompt = `You are StudyFlow AI, a helpful study assistant. 
    
VIDEO CONTEXT: ${context}

USER QUESTION: ${question}

Instructions:
- Answer based ONLY on the video context above
- If you don't know, say so honestly
- Be educational and helpful
- Keep answers concise but thorough
- Use **bold** for key terms

Your response:`;
    
    const response = await callGemini(prompt);
    hideTypingIndicator();
    addAIMessage(response);
    
    // Auto-save chat to localStorage
    saveChatHistory();
}

// Save chat history
function saveChatHistory() {
    if (!currentVideoId) return;
    const savedChats = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    savedChats[currentVideoId] = chatHistory;
    localStorage.setItem('chatHistory', JSON.stringify(savedChats));
}

// Load chat history for selected video
function loadChatHistory() {
    if (!currentVideoId) return;
    const savedChats = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    const history = savedChats[currentVideoId] || [];
    
    // Clear current messages (keep welcome)
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    // Add welcome message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="message-bubble">
            <p>Welcome back! Continue your conversation about "${escapeHtml(currentVideoTitle)}"</p>
        </div>
    `;
    messagesContainer.appendChild(welcomeDiv);
    
    // Restore previous messages
    for (const msg of history) {
        if (msg.role === 'user') {
            addUserMessage(msg.content);
        } else if (msg.role === 'assistant') {
            addAIMessage(msg.content);
        }
    }
}

// Clear chat for current video
function clearChat() {
    if (!currentVideoId) return;
    chatHistory = [];
    const savedChats = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    delete savedChats[currentVideoId];
    localStorage.setItem('chatHistory', JSON.stringify(savedChats));
    loadChatHistory();
    addSystemMessage('Chat history cleared! You can start fresh.');
}

// Export chat
function exportChat() {
    if (!chatHistory.length) {
        showToast('No chat history to export');
        return;
    }
    
    let exportText = `StudyFlow Chat Export\nVideo: ${currentVideoTitle}\nDate: ${new Date().toLocaleString()}\n\n`;
    for (const msg of chatHistory) {
        const role = msg.role === 'user' ? '👤 You' : '🤖 AI';
        exportText += `\n[${role}]\n${msg.content}\n${'─'.repeat(50)}\n`;
    }
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chat_${currentVideoTitle.substring(0, 30)}.txt`;
    link.click();
    showToast('📎 Chat exported');
}

// Initialize
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    loadVideoList();
    
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
    document.getElementById('exportChatBtn')?.addEventListener('click', exportChat);
});
