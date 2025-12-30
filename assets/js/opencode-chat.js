console.log('[WordForge] Script loaded');

(function() {
    'use strict';

    console.log('[WordForge] IIFE executing');

    class WordForgeOpenCode {
        constructor(container) {
            console.log('[WordForge] Constructor called');
            this.container = container;
            
            // Use admin-ajax.php instead of REST API
            if (typeof wordforgeOpenCode === 'undefined') {
                this.showError('Missing configuration. wordforgeOpenCode not defined.');
                return;
            }
            
            this.ajaxUrl = wordforgeOpenCode.ajaxUrl;
            this.nonce = wordforgeOpenCode.nonce;
            this.serverUrl = null;
            this.serverPort = null;

            console.log('[WordForge] AJAX URL:', this.ajaxUrl);
            console.log('[WordForge] Nonce:', this.nonce ? 'present' : 'MISSING');

            if (!this.ajaxUrl || !this.nonce) {
                this.showError('Missing configuration. AJAX URL or nonce not set.');
                return;
            }

            this.init();
        }

        async init() {
            console.log('[WordForge] init() called');
            try {
                const status = await this.fetchStatus();
                console.log('[WordForge] Status:', status);
                this.render(status);
            } catch (error) {
                console.error('[WordForge] Init error:', error);
                this.showError(error.message);
            }
        }

        async fetchStatus() {
            console.log('[WordForge] Fetching status via AJAX...');

            const formData = new FormData();
            formData.append('action', 'wordforge_opencode_status');
            formData.append('nonce', this.nonce);

            const response = await fetch(this.ajaxUrl, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });

            console.log('[WordForge] Response status:', response.status);

            if (!response.ok) {
                const text = await response.text();
                console.error('[WordForge] Error response:', text);
                throw new Error(`AJAX error: ${response.status} - ${text.substring(0, 100)}`);
            }

            const result = await response.json();
            
            // WordPress AJAX returns { success: true, data: {...} }
            if (!result.success) {
                throw new Error(result.data?.error || 'Unknown error');
            }
            
            return result.data;
        }

        async apiCall(action) {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('nonce', this.nonce);

            const response = await fetch(this.ajaxUrl, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.data?.error || 'Unknown error');
            }
            
            return result.data;
        }

        render(status) {
            const { binary, server } = status;

            if (server.running) {
                this.serverUrl = server.url;
                this.serverPort = server.port;
                this.showRunning(server);
            } else if (!binary.is_installed) {
                this.showDownload(binary);
            } else {
                this.showStart(binary);
            }
        }

        showDownload(binary) {
            this.container.innerHTML = `
                <div class="wordforge-opencode-setup">
                    <h3>Download OpenCode</h3>
                    <p>Download the OpenCode binary to enable the AI assistant.</p>
                    <p class="description">
                        Platform: <code>${binary.os}-${binary.arch}</code><br>
                        Target: <code>${binary.binary_name}</code>
                    </p>
                    <button type="button" class="button button-primary button-hero" id="wf-download-btn">
                        <span class="dashicons dashicons-download"></span>
                        Download OpenCode
                    </button>
                    <div id="wf-progress" style="display:none; margin-top:12px;">
                        <span class="spinner is-active" style="float:none;"></span>
                        <span id="wf-progress-text">Downloading... This may take a minute.</span>
                    </div>
                </div>
            `;

            document.getElementById('wf-download-btn').addEventListener('click', () => this.doDownload());
        }

        showStart(binary) {
            this.container.innerHTML = `
                <div class="wordforge-opencode-setup">
                    <h3>Start OpenCode Server</h3>
                    <p>OpenCode is installed. Start the server to use the AI assistant.</p>
                    <p class="description">
                        Version: <code>${binary.version || 'unknown'}</code><br>
                        Binary: <code>${binary.binary_name}</code>
                    </p>
                    <button type="button" class="button button-primary button-hero" id="wf-start-btn">
                        <span class="dashicons dashicons-controls-play"></span>
                        Start Server
                    </button>
                    <div id="wf-progress" style="display:none; margin-top:12px;">
                        <span class="spinner is-active" style="float:none;"></span>
                        <span id="wf-progress-text">Starting server...</span>
                    </div>
                </div>
            `;

            document.getElementById('wf-start-btn').addEventListener('click', () => this.doStart());
        }

        showRunning(server) {
            this.container.innerHTML = `
                <div class="wordforge-opencode-running">
                    <div class="wordforge-opencode-header">
                        <span class="status-indicator online"></span>
                        <span>OpenCode running on port <strong>${server.port}</strong></span>
                        <button type="button" class="button button-small" id="wf-stop-btn">Stop Server</button>
                    </div>
                    <div class="wordforge-opencode-frame-container">
                        <div class="wordforge-opencode-frame-notice">
                            <p><strong>OpenCode TUI available at:</strong></p>
                            <code>${server.url}</code>
                            <p class="description" style="margin-top:12px;">
                                Note: The TUI runs on the server's localhost. 
                                To access it remotely, you need to set up a reverse proxy or SSH tunnel.
                            </p>
                            <p class="description">
                                <strong>For local development:</strong> Open <a href="${server.url}" target="_blank">${server.url}</a> in a new tab.
                            </p>
                            <p class="description">
                                <strong>For remote access:</strong> Run <code>ssh -L ${server.port}:localhost:${server.port} your-server</code> then open <a href="http://localhost:${server.port}" target="_blank">http://localhost:${server.port}</a>
                            </p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('wf-stop-btn').addEventListener('click', () => this.doStop());
        }

        showError(message) {
            this.container.innerHTML = `
                <div class="wordforge-opencode-error">
                    <span class="dashicons dashicons-warning"></span>
                    <p><strong>Error:</strong> ${this.escapeHtml(message)}</p>
                    <p style="font-size:12px;color:#666;">
                        AJAX URL: <code>${this.escapeHtml(this.ajaxUrl || 'not set')}</code><br>
                        Check browser console for details.
                    </p>
                    <button type="button" class="button" id="wf-retry-btn">Retry</button>
                </div>
            `;

            document.getElementById('wf-retry-btn')?.addEventListener('click', () => this.init());
        }

        async doDownload() {
            const btn = document.getElementById('wf-download-btn');
            const progress = document.getElementById('wf-progress');
            
            btn.disabled = true;
            progress.style.display = 'block';

            try {
                console.log('[WordForge] Starting download...');
                await this.apiCall('wordforge_opencode_download');
                console.log('[WordForge] Download complete, refreshing status...');
                const status = await this.fetchStatus();
                this.render(status);
            } catch (error) {
                console.error('[WordForge] Download error:', error);
                btn.disabled = false;
                progress.style.display = 'none';
                alert('Download failed: ' + error.message);
            }
        }

        async doStart() {
            const btn = document.getElementById('wf-start-btn');
            const progress = document.getElementById('wf-progress');

            btn.disabled = true;
            progress.style.display = 'block';

            try {
                console.log('[WordForge] Starting server...');
                const result = await this.apiCall('wordforge_opencode_start');
                console.log('[WordForge] Server started:', result);
                this.serverUrl = result.url;
                this.serverPort = result.port;
                const status = await this.fetchStatus();
                this.render(status);
            } catch (error) {
                console.error('[WordForge] Start error:', error);
                btn.disabled = false;
                progress.style.display = 'none';
                alert('Failed to start server: ' + error.message);
            }
        }

        async doStop() {
            try {
                console.log('[WordForge] Stopping server...');
                await this.apiCall('wordforge_opencode_stop');
                console.log('[WordForge] Server stopped');
                const status = await this.fetchStatus();
                this.render(status);
            } catch (error) {
                console.error('[WordForge] Stop error:', error);
                alert('Failed to stop server: ' + error.message);
            }
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    }

    function initWhenReady() {
        console.log('[WordForge] initWhenReady called, readyState:', document.readyState);
        const container = document.getElementById('wordforge-opencode-app');
        
        if (container) {
            console.log('[WordForge] Container found, initializing...');
            new WordForgeOpenCode(container);
        } else {
            console.warn('[WordForge] Container #wordforge-opencode-app not found!');
        }
    }

    if (document.readyState === 'loading') {
        console.log('[WordForge] Document still loading, waiting for DOMContentLoaded');
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        console.log('[WordForge] Document already ready, initializing immediately');
        initWhenReady();
    }
})();
