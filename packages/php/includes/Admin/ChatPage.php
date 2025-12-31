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
				<?php $this->render_chat_app( $server_status ); ?>
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

	private function render_chat_app( array $server_status ): void {
		$this->enqueue_assets( $server_status );
		?>
		<div id="wordforge-chat-root"></div>
		<?php
	}

	private function enqueue_assets( array $server_status ): void {
		$asset_file = include WORDFORGE_PLUGIN_DIR . 'assets/js/chat.asset.php';

		\wp_enqueue_script(
			'wordforge-chat',
			\plugins_url( 'assets/js/chat.js', WORDFORGE_PLUGIN_FILE ),
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);

		\wp_enqueue_style( 'wp-components' );

		$config = [
			'proxyUrl'     => \rest_url( 'wordforge/v1/opencode/proxy' ),
			'nonce'        => \wp_create_nonce( 'wp_rest' ),
			'serverStatus' => $server_status,
			'i18n'         => [
				'newSession'       => __( 'New Session', 'wordforge' ),
				'untitled'         => __( 'Untitled Session', 'wordforge' ),
				'selectSession'    => __( 'Select a session', 'wordforge' ),
				'noMessages'       => __( 'No messages yet. Start the conversation!', 'wordforge' ),
				'you'              => __( 'You', 'wordforge' ),
				'assistant'        => __( 'Assistant', 'wordforge' ),
				'thinking'         => __( 'Thinking...', 'wordforge' ),
				'error'            => __( 'Error', 'wordforge' ),
				'retry'            => __( 'Retrying...', 'wordforge' ),
				'idle'             => __( 'Ready', 'wordforge' ),
				'busy'             => __( 'Busy', 'wordforge' ),
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
				'deleteTitle'      => __( 'Delete Session?', 'wordforge' ),
				'deleteConfirm'    => __( 'Are you sure you want to delete this session? This action cannot be undone.', 'wordforge' ),
				'cancel'           => __( 'Cancel', 'wordforge' ),
				'delete'           => __( 'Delete', 'wordforge' ),
				'send'             => __( 'Send', 'wordforge' ),
				'stop'             => __( 'Stop', 'wordforge' ),
				'sessions'         => __( 'Sessions', 'wordforge' ),
				'serverRunning'    => __( 'Server running', 'wordforge' ),
				'typeMessage'      => __( 'Type your message...', 'wordforge' ),
			],
		];

		\wp_add_inline_script(
			'wordforge-chat',
			'window.wordforgeChat = ' . \wp_json_encode( $config ) . ';',
			'before'
		);
	}
}
