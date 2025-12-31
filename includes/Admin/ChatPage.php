<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ServerProcess;

class ChatPage {

	public const SLUG = 'wordforge-chat';

	public function render(): void {
		$binary_info   = BinaryManager::get_platform_info();
		$server_status = ServerProcess::get_status();
		$is_ready      = $binary_info['is_installed'] && $server_status['running'];
		?>
		<div class="wrap wordforge-wrap wordforge-chat-wrap">
			<h1>
				<span class="wordforge-logo">⚒️</span>
				<?php \esc_html_e( 'OpenCode Chat', 'wordforge' ); ?>
			</h1>

			<?php if ( ! $is_ready ) : ?>
				<?php $this->render_not_ready( $binary_info, $server_status ); ?>
			<?php else : ?>
				<?php $this->render_chat_ui( $server_status ); ?>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_not_ready( array $binary_info, array $server_status ): void {
		$settings_url = \admin_url( 'admin.php?page=' . MenuManager::MENU_SLUG );
		?>
		<div class="wordforge-card" style="max-width: 600px;">
			<h2><?php \esc_html_e( 'OpenCode Not Ready', 'wordforge' ); ?></h2>

			<table class="wordforge-status-table">
				<tr>
					<td><?php \esc_html_e( 'Binary', 'wordforge' ); ?></td>
					<td>
						<?php if ( $binary_info['is_installed'] ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php \esc_html_e( 'Installed', 'wordforge' ); ?></span>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-error"><?php \esc_html_e( 'Not Installed', 'wordforge' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<td><?php \esc_html_e( 'Server', 'wordforge' ); ?></td>
					<td>
						<?php if ( $server_status['running'] ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php \esc_html_e( 'Running', 'wordforge' ); ?></span>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-error"><?php \esc_html_e( 'Stopped', 'wordforge' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
			</table>

			<p style="margin-top: 16px;">
				<?php if ( ! $binary_info['is_installed'] ) : ?>
					<?php \esc_html_e( 'Download the OpenCode binary from Settings to get started.', 'wordforge' ); ?>
				<?php else : ?>
					<?php \esc_html_e( 'Start the OpenCode server from Settings to use the chat.', 'wordforge' ); ?>
				<?php endif; ?>
			</p>

			<p>
				<a href="<?php echo \esc_url( $settings_url ); ?>" class="button button-primary">
					<span class="dashicons dashicons-admin-settings" style="margin-right: 4px; line-height: 1.4;"></span>
					<?php \esc_html_e( 'Go to Settings', 'wordforge' ); ?>
				</a>
			</p>
		</div>
		<?php
	}

	private function render_chat_ui( array $server_status ): void {
		$this->enqueue_assets();
		?>
		<div class="wf-chat-container">
			<!-- Sidebar: Sessions List -->
			<div class="wf-chat-sidebar">
				<div class="wf-sidebar-header">
					<h3><?php \esc_html_e( 'Sessions', 'wordforge' ); ?></h3>
					<button type="button" class="button button-small" id="wf-new-session" title="<?php \esc_attr_e( 'New Session', 'wordforge' ); ?>">
						<span class="dashicons dashicons-plus-alt2"></span>
					</button>
				</div>

				<div class="wf-sessions-list" id="wf-sessions-list">
					<div class="wf-sessions-loading">
						<span class="spinner is-active"></span>
					</div>
				</div>

				<div class="wf-sidebar-footer">
					<div class="wf-server-status">
						<span class="wf-status-dot wf-status-online"></span>
						<span><?php \esc_html_e( 'Server running', 'wordforge' ); ?></span>
						<code>:<?php echo \esc_html( $server_status['port'] ); ?></code>
					</div>
				</div>
			</div>

			<!-- Main: Chat Area -->
			<div class="wf-chat-main">
				<!-- Chat Header -->
				<div class="wf-chat-header" id="wf-chat-header">
					<div class="wf-chat-title">
						<span id="wf-session-title"><?php \esc_html_e( 'Select a session', 'wordforge' ); ?></span>
						<span class="wf-session-status" id="wf-session-status"></span>
					</div>
					<div class="wf-chat-actions">
						<button type="button" class="button button-small" id="wf-delete-session" title="<?php \esc_attr_e( 'Delete Session', 'wordforge' ); ?>" disabled>
							<span class="dashicons dashicons-trash"></span>
						</button>
					</div>
				</div>

				<!-- Messages Area -->
				<div class="wf-messages-container" id="wf-messages-container">
					<div class="wf-messages-placeholder" id="wf-messages-placeholder">
						<div class="wf-placeholder-icon">
							<span class="dashicons dashicons-format-chat"></span>
						</div>
						<p><?php \esc_html_e( 'Select a session to view messages, or create a new one.', 'wordforge' ); ?></p>
					</div>
					<div class="wf-messages-list" id="wf-messages-list" style="display: none;"></div>
				</div>

				<!-- Input Area -->
				<div class="wf-input-container" id="wf-input-container">
					<div class="wf-input-wrapper">
						<textarea 
							id="wf-message-input" 
							placeholder="<?php \esc_attr_e( 'Type your message...', 'wordforge' ); ?>"
							rows="1"
							disabled
						></textarea>
						<div class="wf-input-actions">
							<button type="button" class="button button-primary" id="wf-send-message" disabled>
								<span class="dashicons dashicons-arrow-right-alt"></span>
								<?php \esc_html_e( 'Send', 'wordforge' ); ?>
							</button>
							<button type="button" class="button" id="wf-stop-message" style="display: none;">
								<span class="dashicons dashicons-controls-pause"></span>
								<?php \esc_html_e( 'Stop', 'wordforge' ); ?>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Delete Confirmation Modal -->
		<div class="wf-modal" id="wf-delete-modal" style="display: none;">
			<div class="wf-modal-backdrop"></div>
			<div class="wf-modal-content">
				<h3><?php \esc_html_e( 'Delete Session?', 'wordforge' ); ?></h3>
				<p><?php \esc_html_e( 'Are you sure you want to delete this session? This action cannot be undone.', 'wordforge' ); ?></p>
				<p class="wf-modal-session-name" id="wf-delete-session-name"></p>
				<div class="wf-modal-actions">
					<button type="button" class="button" id="wf-delete-cancel">
						<?php \esc_html_e( 'Cancel', 'wordforge' ); ?>
					</button>
					<button type="button" class="button button-primary wf-button-danger" id="wf-delete-confirm">
						<?php \esc_html_e( 'Delete', 'wordforge' ); ?>
					</button>
				</div>
			</div>
		</div>

		<?php $this->render_styles(); ?>
		<?php
	}

	private function enqueue_assets(): void {
		$script_url = \plugins_url( 'assets/js/opencode-chat.js', WORDFORGE_PLUGIN_FILE );

		\wp_enqueue_script(
			'wordforge-chat',
			$script_url,
			[],
			WORDFORGE_VERSION,
			true
		);

		\wp_localize_script(
			'wordforge-chat',
			'wordforgeChat',
			[
				'proxyUrl' => \rest_url( 'wordforge/v1/opencode/proxy' ),
				'nonce'    => \wp_create_nonce( 'wp_rest' ),
				'i18n'     => [
					'newSession'       => __( 'New Session', 'wordforge' ),
					'untitled'         => __( 'Untitled Session', 'wordforge' ),
					'selectSession'    => __( 'Select a session', 'wordforge' ),
					'noMessages'       => __( 'No messages yet. Start the conversation!', 'wordforge' ),
					'previousMessages' => __( '%d previous messages', 'wordforge' ),
					'you'              => __( 'You', 'wordforge' ),
					'assistant'        => __( 'Assistant', 'wordforge' ),
					'sending'          => __( 'Sending...', 'wordforge' ),
					'thinking'         => __( 'Thinking...', 'wordforge' ),
					'error'            => __( 'Error', 'wordforge' ),
					'retry'            => __( 'Retrying...', 'wordforge' ),
					'idle'             => __( 'Ready', 'wordforge' ),
					'busy'             => __( 'Busy', 'wordforge' ),
					'tool'             => __( 'Tool', 'wordforge' ),
					'pending'          => __( 'Pending', 'wordforge' ),
					'running'          => __( 'Running', 'wordforge' ),
					'completed'        => __( 'Completed', 'wordforge' ),
					'failed'           => __( 'Failed', 'wordforge' ),
					'noSessions'       => __( 'No sessions yet', 'wordforge' ),
					'loadError'        => __( 'Failed to load sessions', 'wordforge' ),
					'createError'      => __( 'Failed to create session', 'wordforge' ),
					'deleteError'      => __( 'Failed to delete session', 'wordforge' ),
					'sendError'        => __( 'Failed to send message', 'wordforge' ),
					'connectionError'  => __( 'Connection lost. Reconnecting...', 'wordforge' ),
				],
			]
		);
	}

	private function render_styles(): void {
		?>
		<style>
			/* Chat Container Layout */
			.wf-chat-container {
				display: flex;
				height: calc(100vh - 120px);
				min-height: 500px;
				background: #fff;
				border: 1px solid #c3c4c7;
				border-radius: 4px;
				overflow: hidden;
			}

			/* Sidebar */
			.wf-chat-sidebar {
				width: 280px;
				min-width: 280px;
				border-right: 1px solid #c3c4c7;
				display: flex;
				flex-direction: column;
				background: #f6f7f7;
			}

			.wf-sidebar-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 12px 16px;
				border-bottom: 1px solid #c3c4c7;
				background: #fff;
			}

			.wf-sidebar-header h3 {
				margin: 0;
				font-size: 14px;
				font-weight: 600;
			}

			.wf-sidebar-header .button {
				padding: 0 6px;
				min-height: 28px;
			}

			.wf-sidebar-header .dashicons {
				font-size: 18px;
				width: 18px;
				height: 18px;
				line-height: 28px;
			}

			/* Sessions List */
			.wf-sessions-list {
				flex: 1;
				overflow-y: auto;
				padding: 8px;
			}

			.wf-sessions-loading {
				display: flex;
				justify-content: center;
				padding: 20px;
			}

			.wf-sessions-loading .spinner {
				float: none;
				margin: 0;
			}

			.wf-session-item {
				padding: 12px;
				margin-bottom: 4px;
				background: #fff;
				border: 1px solid #dcdcde;
				border-radius: 4px;
				cursor: pointer;
				transition: all 0.15s ease;
			}

			.wf-session-item:hover {
				border-color: #2271b1;
			}

			.wf-session-item.active {
				border-color: #2271b1;
				background: #f0f6fc;
			}

			.wf-session-item-title {
				font-weight: 500;
				font-size: 13px;
				margin-bottom: 4px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.wf-session-item-meta {
				font-size: 11px;
				color: #646970;
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.wf-session-item-status {
				display: inline-flex;
				align-items: center;
				gap: 4px;
			}

			.wf-sessions-empty {
				text-align: center;
				padding: 20px;
				color: #646970;
				font-size: 13px;
			}

			/* Sidebar Footer */
			.wf-sidebar-footer {
				padding: 12px 16px;
				border-top: 1px solid #c3c4c7;
				background: #fff;
			}

			.wf-server-status {
				display: flex;
				align-items: center;
				gap: 6px;
				font-size: 12px;
				color: #646970;
			}

			.wf-server-status code {
				background: #f0f0f1;
				padding: 2px 6px;
				border-radius: 3px;
				font-size: 11px;
			}

			/* Status Dots */
			.wf-status-dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				flex-shrink: 0;
			}

			.wf-status-online { background: #00a32a; }
			.wf-status-busy { background: #dba617; }
			.wf-status-offline { background: #d63638; }
			.wf-status-idle { background: #646970; }

			/* Main Chat Area */
			.wf-chat-main {
				flex: 1;
				display: flex;
				flex-direction: column;
				min-width: 0;
			}

			/* Chat Header */
			.wf-chat-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 12px 16px;
				border-bottom: 1px solid #c3c4c7;
				background: #fff;
			}

			.wf-chat-title {
				display: flex;
				align-items: center;
				gap: 8px;
				font-weight: 500;
				min-width: 0;
			}

			#wf-session-title {
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.wf-session-status {
				font-size: 11px;
				padding: 2px 8px;
				border-radius: 10px;
				background: #f0f0f1;
				color: #646970;
				flex-shrink: 0;
			}

			.wf-session-status.busy {
				background: #fff3cd;
				color: #856404;
			}

			.wf-session-status.idle {
				background: #d4edda;
				color: #155724;
			}

			.wf-chat-actions .button {
				padding: 0 6px;
				min-height: 28px;
			}

			.wf-chat-actions .dashicons {
				font-size: 16px;
				width: 16px;
				height: 16px;
				line-height: 28px;
			}

			/* Messages Container */
			.wf-messages-container {
				flex: 1;
				overflow-y: auto;
				padding: 16px;
				background: #f9f9f9;
			}

			.wf-messages-placeholder {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				height: 100%;
				color: #646970;
				text-align: center;
			}

			.wf-placeholder-icon .dashicons {
				font-size: 48px;
				width: 48px;
				height: 48px;
				opacity: 0.3;
			}

			.wf-messages-placeholder p {
				margin-top: 12px;
				font-size: 14px;
			}

			/* Messages List */
			.wf-messages-list {
				max-width: 900px;
				margin: 0 auto;
			}

			.wf-previous-messages {
				text-align: center;
				padding: 8px;
				margin-bottom: 16px;
				font-size: 12px;
				color: #646970;
				background: #fff;
				border-radius: 4px;
			}

			/* Message Item */
			.wf-message {
				margin-bottom: 16px;
				padding: 12px 16px;
				background: #fff;
				border-radius: 8px;
				border: 1px solid #dcdcde;
			}

			.wf-message.user {
				background: #f0f6fc;
				border-color: #c5d9ed;
			}

			.wf-message.assistant {
				background: #fff;
			}

			.wf-message.error {
				background: #fcf0f1;
				border-color: #f0b8b8;
			}

			.wf-message-header {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-bottom: 8px;
				font-size: 12px;
			}

			.wf-message-role {
				font-weight: 600;
				color: #1d2327;
			}

			.wf-message-time {
				color: #646970;
			}

			.wf-message-content {
				font-size: 14px;
				line-height: 1.5;
				white-space: pre-wrap;
				word-break: break-word;
			}

			/* Tool Calls */
			.wf-tool-calls {
				margin-top: 12px;
			}

			.wf-tool-call {
				background: #f6f7f7;
				border: 1px solid #dcdcde;
				border-radius: 4px;
				margin-bottom: 8px;
				overflow: hidden;
			}

			.wf-tool-call:last-child {
				margin-bottom: 0;
			}

			.wf-tool-header {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 8px 12px;
				background: #fff;
				border-bottom: 1px solid #dcdcde;
				cursor: pointer;
				font-size: 12px;
			}

			.wf-tool-header:hover {
				background: #f6f7f7;
			}

			.wf-tool-name {
				font-family: monospace;
				font-weight: 500;
				flex: 1;
			}

			.wf-tool-status {
				padding: 2px 6px;
				border-radius: 3px;
				font-size: 10px;
				text-transform: uppercase;
				font-weight: 500;
			}

			.wf-tool-status.pending { background: #f0f0f1; color: #646970; }
			.wf-tool-status.running { background: #fff3cd; color: #856404; }
			.wf-tool-status.completed { background: #d4edda; color: #155724; }
			.wf-tool-status.error { background: #f8d7da; color: #721c24; }

			.wf-tool-toggle {
				color: #646970;
			}

			.wf-tool-details {
				padding: 12px;
				font-size: 12px;
				display: none;
			}

			.wf-tool-details.expanded {
				display: block;
			}

			.wf-tool-section {
				margin-bottom: 8px;
			}

			.wf-tool-section:last-child {
				margin-bottom: 0;
			}

			.wf-tool-section-title {
				font-weight: 500;
				margin-bottom: 4px;
				color: #646970;
			}

			.wf-tool-section-content {
				font-family: monospace;
				font-size: 11px;
				background: #fff;
				padding: 8px;
				border-radius: 3px;
				overflow-x: auto;
				white-space: pre-wrap;
				word-break: break-all;
				max-height: 200px;
				overflow-y: auto;
			}

			/* Thinking/Loading Message */
			.wf-message.thinking {
				background: #fff;
				border-style: dashed;
			}

			.wf-thinking-indicator {
				display: flex;
				align-items: center;
				gap: 8px;
				color: #646970;
			}

			.wf-thinking-indicator .spinner {
				float: none;
				margin: 0;
			}

			/* Input Container */
			.wf-input-container {
				padding: 16px;
				background: #fff;
				border-top: 1px solid #c3c4c7;
			}

			.wf-input-wrapper {
				display: flex;
				gap: 12px;
				align-items: flex-end;
				max-width: 900px;
				margin: 0 auto;
			}

			#wf-message-input {
				flex: 1;
				min-height: 40px;
				max-height: 150px;
				padding: 10px 12px;
				border: 1px solid #8c8f94;
				border-radius: 4px;
				resize: none;
				font-size: 14px;
				line-height: 1.4;
				font-family: inherit;
			}

			#wf-message-input:focus {
				border-color: #2271b1;
				box-shadow: 0 0 0 1px #2271b1;
				outline: none;
			}

			#wf-message-input:disabled {
				background: #f6f7f7;
				cursor: not-allowed;
			}

			.wf-input-actions {
				display: flex;
				gap: 8px;
			}

			.wf-input-actions .button {
				display: flex;
				align-items: center;
				gap: 4px;
				min-height: 40px;
				padding: 0 16px;
			}

			.wf-input-actions .dashicons {
				font-size: 16px;
				width: 16px;
				height: 16px;
			}

			/* Modal */
			.wf-modal {
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				z-index: 100100;
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.wf-modal-backdrop {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba(0, 0, 0, 0.5);
			}

			.wf-modal-content {
				position: relative;
				background: #fff;
				padding: 24px;
				border-radius: 8px;
				max-width: 400px;
				width: 90%;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
			}

			.wf-modal-content h3 {
				margin: 0 0 12px;
			}

			.wf-modal-session-name {
				font-weight: 500;
				background: #f6f7f7;
				padding: 8px 12px;
				border-radius: 4px;
				margin: 12px 0;
			}

			.wf-modal-actions {
				display: flex;
				justify-content: flex-end;
				gap: 8px;
				margin-top: 20px;
			}

			.wf-button-danger {
				background: #d63638 !important;
				border-color: #d63638 !important;
				color: #fff !important;
			}

			.wf-button-danger:hover {
				background: #b32d2e !important;
				border-color: #b32d2e !important;
			}

			/* Responsive */
			@media (max-width: 782px) {
				.wf-chat-container {
					flex-direction: column;
					height: calc(100vh - 90px);
				}

				.wf-chat-sidebar {
					width: 100%;
					min-width: 100%;
					max-height: 200px;
					border-right: none;
					border-bottom: 1px solid #c3c4c7;
				}
			}
		</style>
		<?php
	}
}
