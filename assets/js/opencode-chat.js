(function() {
    'use strict';

    const config = window.wordforgeChat || {};
    const proxyUrl = config.proxyUrl || '';
    const nonce = config.nonce || '';
    const i18n = config.i18n || {};

    let sessions = [];
    let currentSessionId = null;
    let currentMessages = [];
    let sessionStatuses = {};
    let eventSource = null;
    let isSessionBusy = false;

    const els = {};

    function init() {
        if (!proxyUrl) {
            console.error('[WordForge Chat] Missing proxy URL configuration');
            return;
        }

        els.sessionsList = document.getElementById('wf-sessions-list');
        els.newSessionBtn = document.getElementById('wf-new-session');
        els.deleteSessionBtn = document.getElementById('wf-delete-session');
        els.sessionTitle = document.getElementById('wf-session-title');
        els.sessionStatus = document.getElementById('wf-session-status');
        els.messagesContainer = document.getElementById('wf-messages-container');
        els.messagesPlaceholder = document.getElementById('wf-messages-placeholder');
        els.messagesList = document.getElementById('wf-messages-list');
        els.messageInput = document.getElementById('wf-message-input');
        els.sendBtn = document.getElementById('wf-send-message');
        els.stopBtn = document.getElementById('wf-stop-message');
        els.deleteModal = document.getElementById('wf-delete-modal');
        els.deleteSessionName = document.getElementById('wf-delete-session-name');
        els.deleteCancelBtn = document.getElementById('wf-delete-cancel');
        els.deleteConfirmBtn = document.getElementById('wf-delete-confirm');

        bindEvents();
        connectEventStream();
        loadSessions();
        loadSessionStatuses();
    }

    function bindEvents() {
        els.newSessionBtn?.addEventListener('click', createSession);

        els.deleteSessionBtn?.addEventListener('click', showDeleteModal);
        els.deleteCancelBtn?.addEventListener('click', hideDeleteModal);
        els.deleteConfirmBtn?.addEventListener('click', confirmDeleteSession);
        els.deleteModal?.querySelector('.wf-modal-backdrop')?.addEventListener('click', hideDeleteModal);

        els.sendBtn?.addEventListener('click', sendMessage);
        els.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        els.messageInput?.addEventListener('input', autoResizeTextarea);
        els.stopBtn?.addEventListener('click', abortSession);
    }

    async function api(path, options = {}) {
        const url = proxyUrl + '/' + path.replace(/^\//, '');
        const headers = {
            'X-WP-Nonce': nonce,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'same-origin'
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    async function loadSessions() {
        try {
            sessions = await api('session');
            sessions.sort((a, b) => b.time.updated - a.time.updated);
            renderSessionsList();
        } catch (error) {
            console.error('[WordForge Chat] Failed to load sessions:', error);
            els.sessionsList.innerHTML = `
                <div class="wf-sessions-empty wf-sessions-error">
                    <span class="dashicons dashicons-warning"></span>
                    <p>${escapeHtml(i18n.loadError || 'Failed to load sessions')}</p>
                </div>
            `;
        }
    }

    async function loadSessionStatuses() {
        try {
            sessionStatuses = await api('session/status');
            updateSessionStatusIndicators();
        } catch (error) {
            console.error('[WordForge Chat] Failed to load session statuses:', error);
        }
    }

    function renderSessionsList() {
        if (!sessions.length) {
            els.sessionsList.innerHTML = `
                <div class="wf-sessions-empty">
                    <p>${escapeHtml(i18n.noSessions || 'No sessions yet')}</p>
                </div>
            `;
            return;
        }

        els.sessionsList.innerHTML = sessions.map(session => {
            const isActive = session.id === currentSessionId;
            const status = sessionStatuses[session.id];
            const statusType = status?.type || 'idle';
            const time = formatTime(session.time.updated * 1000);
            const title = session.title || i18n.untitled || 'Untitled Session';

            return `
                <div class="wf-session-item ${isActive ? 'active' : ''}" data-session-id="${escapeHtml(session.id)}">
                    <div class="wf-session-item-title">${escapeHtml(title)}</div>
                    <div class="wf-session-item-meta">
                        <span class="wf-session-item-status">
                            <span class="wf-status-dot wf-status-${statusType === 'busy' ? 'busy' : 'idle'}"></span>
                        </span>
                        <span>${time}</span>
                    </div>
                </div>
            `;
        }).join('');

        els.sessionsList.querySelectorAll('.wf-session-item').forEach(item => {
            item.addEventListener('click', () => {
                const sessionId = item.dataset.sessionId;
                selectSession(sessionId);
            });
        });
    }

    function updateSessionStatusIndicators() {
        sessions.forEach(session => {
            const item = els.sessionsList.querySelector(`[data-session-id="${session.id}"]`);
            if (!item) return;

            const status = sessionStatuses[session.id];
            const statusType = status?.type || 'idle';
            const dot = item.querySelector('.wf-status-dot');
            if (dot) {
                dot.className = `wf-status-dot wf-status-${statusType === 'busy' ? 'busy' : 'idle'}`;
            }
        });

        if (currentSessionId) {
            updateCurrentSessionStatus();
        }
    }

    async function createSession() {
        els.newSessionBtn.disabled = true;
        try {
            const session = await api('session', {
                method: 'POST',
                body: JSON.stringify({})
            });
            sessions.unshift(session);
            renderSessionsList();
            selectSession(session.id);
        } catch (error) {
            console.error('[WordForge Chat] Failed to create session:', error);
            alert(i18n.createError || 'Failed to create session');
        } finally {
            els.newSessionBtn.disabled = false;
        }
    }

    async function selectSession(sessionId) {
        currentSessionId = sessionId;
        const session = sessions.find(s => s.id === sessionId);

        renderSessionsList();
        els.sessionTitle.textContent = session?.title || i18n.untitled || 'Untitled Session';
        els.deleteSessionBtn.disabled = false;
        els.messageInput.disabled = false;
        els.sendBtn.disabled = false;

        els.messagesPlaceholder.style.display = 'none';
        els.messagesList.style.display = 'block';

        updateCurrentSessionStatus();
        await loadMessages(sessionId);
    }

    function updateCurrentSessionStatus() {
        const status = sessionStatuses[currentSessionId];
        const statusType = status?.type || 'idle';
        isSessionBusy = statusType === 'busy';

        if (statusType === 'busy') {
            els.sessionStatus.textContent = i18n.busy || 'Busy';
            els.sessionStatus.className = 'wf-session-status busy';
            els.sendBtn.style.display = 'none';
            els.stopBtn.style.display = 'inline-flex';
            els.messageInput.disabled = true;
        } else if (statusType === 'retry') {
            els.sessionStatus.textContent = i18n.retry || 'Retrying...';
            els.sessionStatus.className = 'wf-session-status busy';
            els.sendBtn.style.display = 'none';
            els.stopBtn.style.display = 'inline-flex';
            els.messageInput.disabled = true;
        } else {
            els.sessionStatus.textContent = i18n.idle || 'Ready';
            els.sessionStatus.className = 'wf-session-status idle';
            els.sendBtn.style.display = 'inline-flex';
            els.stopBtn.style.display = 'none';
            els.messageInput.disabled = false;
        }
    }

    function showDeleteModal() {
        if (!currentSessionId) return;
        const session = sessions.find(s => s.id === currentSessionId);
        els.deleteSessionName.textContent = session?.title || i18n.untitled || 'Untitled Session';
        els.deleteModal.style.display = 'flex';
    }

    function hideDeleteModal() {
        els.deleteModal.style.display = 'none';
    }

    async function confirmDeleteSession() {
        if (!currentSessionId) return;

        els.deleteConfirmBtn.disabled = true;
        try {
            await api(`session/${currentSessionId}`, { method: 'DELETE' });
            sessions = sessions.filter(s => s.id !== currentSessionId);
            currentSessionId = null;
            currentMessages = [];

            hideDeleteModal();
            renderSessionsList();
            resetChatArea();
        } catch (error) {
            console.error('[WordForge Chat] Failed to delete session:', error);
            alert(i18n.deleteError || 'Failed to delete session');
        } finally {
            els.deleteConfirmBtn.disabled = false;
        }
    }

    function resetChatArea() {
        els.sessionTitle.textContent = i18n.selectSession || 'Select a session';
        els.sessionStatus.textContent = '';
        els.sessionStatus.className = 'wf-session-status';
        els.deleteSessionBtn.disabled = true;
        els.messageInput.disabled = true;
        els.messageInput.value = '';
        els.sendBtn.disabled = true;
        els.messagesPlaceholder.style.display = 'flex';
        els.messagesList.style.display = 'none';
        els.messagesList.innerHTML = '';
    }

    async function loadMessages(sessionId) {
        els.messagesList.innerHTML = `
            <div class="wf-messages-loading">
                <span class="spinner is-active"></span>
            </div>
        `;

        try {
            const messages = await api(`session/${sessionId}/message?limit=10`);
            currentMessages = messages || [];
            renderMessages();
        } catch (error) {
            console.error('[WordForge Chat] Failed to load messages:', error);
            els.messagesList.innerHTML = `
                <div class="wf-messages-error">
                    <span class="dashicons dashicons-warning"></span>
                    <p>${escapeHtml(i18n.loadError || 'Failed to load messages')}</p>
                </div>
            `;
        }
    }

    function renderMessages() {
        if (!currentMessages.length) {
            els.messagesList.innerHTML = `
                <div class="wf-messages-empty">
                    <p>${escapeHtml(i18n.noMessages || 'No messages yet. Start the conversation!')}</p>
                </div>
            `;
            return;
        }

        let html = currentMessages.map(msg => renderMessage(msg)).join('');
        els.messagesList.innerHTML = html;

        els.messagesList.querySelectorAll('.wf-tool-header').forEach(header => {
            header.addEventListener('click', () => {
                const details = header.nextElementSibling;
                const toggle = header.querySelector('.wf-tool-toggle');
                if (details.classList.contains('expanded')) {
                    details.classList.remove('expanded');
                    toggle.textContent = '+';
                } else {
                    details.classList.add('expanded');
                    toggle.textContent = '-';
                }
            });
        });

        scrollToBottom();
    }

    function renderMessage(msg) {
        const { info, parts } = msg;
        const isUser = info.role === 'user';
        const isError = info.error != null;
        const time = formatTime(info.time.created * 1000);

        const textParts = parts.filter(p => p.type === 'text');
        const textContent = textParts.map(p => p.text || '').join('\n');
        const toolParts = parts.filter(p => p.type === 'tool');

        let html = `
            <div class="wf-message ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''}">
                <div class="wf-message-header">
                    <span class="wf-message-role">${escapeHtml(isUser ? (i18n.you || 'You') : (i18n.assistant || 'Assistant'))}</span>
                    <span class="wf-message-time">${time}</span>
                </div>
        `;

        if (textContent) {
            html += `<div class="wf-message-content">${escapeHtml(textContent)}</div>`;
        }

        if (isError && info.error) {
            html += `<div class="wf-message-content wf-error-content">${escapeHtml(info.error.data?.message || info.error.name || 'Error')}</div>`;
        }

        if (toolParts.length > 0) {
            html += `<div class="wf-tool-calls">`;
            html += toolParts.map(tool => renderToolCall(tool)).join('');
            html += `</div>`;
        }

        html += `</div>`;
        return html;
    }

    function renderToolCall(tool) {
        const state = tool.state || {};
        const status = state.status || 'pending';
        const toolName = tool.tool || 'unknown';
        const title = state.title || toolName;

        let statusLabel = i18n.pending || 'Pending';
        if (status === 'running') statusLabel = i18n.running || 'Running';
        else if (status === 'completed') statusLabel = i18n.completed || 'Completed';
        else if (status === 'error') statusLabel = i18n.failed || 'Failed';

        let detailsHtml = '';
        
        if (state.input) {
            detailsHtml += `
                <div class="wf-tool-section">
                    <div class="wf-tool-section-title">Input</div>
                    <div class="wf-tool-section-content">${escapeHtml(JSON.stringify(state.input, null, 2))}</div>
                </div>
            `;
        }

        if (state.output) {
            const output = typeof state.output === 'string' ? state.output : JSON.stringify(state.output, null, 2);
            detailsHtml += `
                <div class="wf-tool-section">
                    <div class="wf-tool-section-title">Output</div>
                    <div class="wf-tool-section-content">${escapeHtml(output)}</div>
                </div>
            `;
        }

        if (state.error) {
            detailsHtml += `
                <div class="wf-tool-section">
                    <div class="wf-tool-section-title">Error</div>
                    <div class="wf-tool-section-content">${escapeHtml(state.error)}</div>
                </div>
            `;
        }

        return `
            <div class="wf-tool-call">
                <div class="wf-tool-header">
                    <span class="wf-tool-name">${escapeHtml(title)}</span>
                    <span class="wf-tool-status ${status}">${statusLabel}</span>
                    <span class="wf-tool-toggle">+</span>
                </div>
                <div class="wf-tool-details">
                    ${detailsHtml || '<p>No details available</p>'}
                </div>
            </div>
        `;
    }

    async function sendMessage() {
        const text = els.messageInput.value.trim();
        if (!text || !currentSessionId || isSessionBusy) return;

        els.messageInput.value = '';
        autoResizeTextarea();

        const tempUserMsg = {
            info: {
                id: 'temp-user-' + Date.now(),
                role: 'user',
                time: { created: Date.now() / 1000 }
            },
            parts: [{ type: 'text', text: text }]
        };
        currentMessages.push(tempUserMsg);
        renderMessages();

        const thinkingId = 'thinking-' + Date.now();
        addThinkingIndicator(thinkingId);

        try {
            await api(`session/${currentSessionId}/prompt_async`, {
                method: 'POST',
                body: JSON.stringify({
                    parts: [{ type: 'text', text: text }]
                })
            });
        } catch (error) {
            console.error('[WordForge Chat] Failed to send message:', error);
            removeThinkingIndicator(thinkingId);
            alert(i18n.sendError || 'Failed to send message');
        }
    }

    async function abortSession() {
        if (!currentSessionId) return;

        try {
            await api(`session/${currentSessionId}/abort`, { method: 'POST' });
        } catch (error) {
            console.error('[WordForge Chat] Failed to abort session:', error);
        }
    }

    function addThinkingIndicator(id) {
        const indicator = document.createElement('div');
        indicator.id = id;
        indicator.className = 'wf-message assistant thinking';
        indicator.innerHTML = `
            <div class="wf-message-header">
                <span class="wf-message-role">${escapeHtml(i18n.assistant || 'Assistant')}</span>
            </div>
            <div class="wf-thinking-indicator">
                <span class="spinner is-active"></span>
                <span>${escapeHtml(i18n.thinking || 'Thinking...')}</span>
            </div>
        `;
        els.messagesList.appendChild(indicator);
        scrollToBottom();
    }

    function removeThinkingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    function removeAllThinkingIndicators() {
        els.messagesList.querySelectorAll('.wf-message.thinking').forEach(el => el.remove());
    }

    function connectEventStream() {
        if (eventSource) {
            eventSource.close();
        }

        const url = proxyUrl + '/event?_wf_nonce=' + encodeURIComponent(nonce);
        eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onopen = () => {
            console.log('[WordForge Chat] Event stream connected');
        };

        eventSource.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                handleEvent(event);
            } catch (error) {
                console.error('[WordForge Chat] Failed to parse event:', error);
            }
        };

        eventSource.onerror = (e) => {
            console.error('[WordForge Chat] Event stream error:', e);
            setTimeout(connectEventStream, 5000);
        };
    }

    function handleEvent(event) {
        const { type, properties } = event;

        switch (type) {
            case 'session.created':
                handleSessionCreated(properties.info);
                break;
            case 'session.updated':
                handleSessionUpdated(properties.info);
                break;
            case 'session.deleted':
                handleSessionDeleted(properties.info);
                break;
            case 'session.status':
                handleSessionStatus(properties.sessionID, properties.status);
                break;
            case 'message.updated':
                handleMessageUpdated(properties.info);
                break;
            case 'message.part.updated':
                handleMessagePartUpdated(properties.part, properties.delta);
                break;
        }
    }

    function handleSessionCreated(session) {
        const exists = sessions.some(s => s.id === session.id);
        if (!exists) {
            sessions.unshift(session);
            renderSessionsList();
        }
    }

    function handleSessionUpdated(session) {
        const index = sessions.findIndex(s => s.id === session.id);
        if (index !== -1) {
            sessions[index] = session;
            renderSessionsList();
            if (session.id === currentSessionId) {
                els.sessionTitle.textContent = session.title || i18n.untitled || 'Untitled Session';
            }
        }
    }

    function handleSessionDeleted(session) {
        sessions = sessions.filter(s => s.id !== session.id);
        renderSessionsList();
        if (session.id === currentSessionId) {
            currentSessionId = null;
            currentMessages = [];
            resetChatArea();
        }
    }

    function handleSessionStatus(sessionId, status) {
        sessionStatuses[sessionId] = status;
        updateSessionStatusIndicators();

        if (sessionId === currentSessionId && status.type === 'idle') {
            removeAllThinkingIndicators();
        }
    }

    function handleMessageUpdated(message) {
        if (message.sessionID !== currentSessionId) return;

        removeAllThinkingIndicators();

        const index = currentMessages.findIndex(m => m.info.id === message.id);
        if (index === -1) {
            loadMessages(currentSessionId);
        } else {
            currentMessages[index].info = message;
            renderMessages();
        }
    }

    function handleMessagePartUpdated(part, delta) {
        if (part.sessionID !== currentSessionId) return;

        const msgIndex = currentMessages.findIndex(m => m.info.id === part.messageID);
        if (msgIndex === -1) {
            loadMessages(currentSessionId);
            return;
        }

        const msg = currentMessages[msgIndex];
        const partIndex = msg.parts.findIndex(p => p.id === part.id);
        
        if (partIndex === -1) {
            msg.parts.push(part);
        } else {
            msg.parts[partIndex] = part;
        }

        removeAllThinkingIndicators();
        renderMessages();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }

        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function autoResizeTextarea() {
        els.messageInput.style.height = 'auto';
        els.messageInput.style.height = Math.min(els.messageInput.scrollHeight, 150) + 'px';
    }

    function scrollToBottom() {
        els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
