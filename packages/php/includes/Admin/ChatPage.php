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

		$this->enqueue_assets( $server_status );
		?>
		<div class="wrap wordforge-wrap wordforge-chat-wrap">
			<h1>
				<span class="wordforge-logo">⚒️</span>
				<?php \esc_html_e( 'OpenCode Chat', 'wordforge' ); ?>
			</h1>

			<div id="wordforge-chat-root"></div>
		</div>
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

		\wp_enqueue_style(
			'wordforge-chat',
			\plugins_url( 'assets/js/chat.css', WORDFORGE_PLUGIN_FILE ),
			[ 'wp-components' ],
			$asset_file['version']
		);

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
