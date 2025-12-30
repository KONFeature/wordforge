<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ServerProcess;

class OpenCodePage {

	public function __construct() {
		add_action( 'admin_menu', [ $this, 'add_menu_page' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	public function add_menu_page(): void {
		add_submenu_page(
			'options-general.php',
			__( 'OpenCode AI', 'wordforge' ),
			__( 'OpenCode AI', 'wordforge' ),
			'manage_options',
			'wordforge-opencode',
			[ $this, 'render_page' ]
		);
	}

	public function enqueue_assets( string $hook ): void {
		if ( 'settings_page_wordforge-opencode' !== $hook ) {
			return;
		}

		wp_add_inline_style( 'common', $this->get_styles() );
	}

	public function render_page(): void {
		$server_status = ServerProcess::get_status();
		$binary_info   = BinaryManager::get_platform_info();
		$is_running    = $server_status['running'];
		$proxy_base    = rest_url( 'wordforge/v1/opencode/proxy/' );
		$nonce         = wp_create_nonce( 'wp_rest' );
		?>
		<div class="wrap wordforge-opencode-page">
			<h1>
				<span class="dashicons dashicons-format-chat"></span>
				<?php esc_html_e( 'OpenCode AI Assistant', 'wordforge' ); ?>
			</h1>

			<?php if ( ! $binary_info['is_installed'] ) : ?>
				<div class="wordforge-opencode-notice notice-warning">
					<p><strong><?php esc_html_e( 'OpenCode not installed', 'wordforge' ); ?></strong></p>
					<p><?php esc_html_e( 'Download the OpenCode binary from the WordForge settings page.', 'wordforge' ); ?></p>
					<p>
						<a href="<?php echo esc_url( admin_url( 'options-general.php?page=wordforge' ) ); ?>" class="button button-primary">
							<?php esc_html_e( 'Go to Settings', 'wordforge' ); ?>
						</a>
					</p>
				</div>
			<?php elseif ( ! $is_running ) : ?>
				<div class="wordforge-opencode-notice notice-info">
					<p><strong><?php esc_html_e( 'OpenCode server not running', 'wordforge' ); ?></strong></p>
					<p><?php esc_html_e( 'Start the server to use the AI assistant.', 'wordforge' ); ?></p>
					<p>
						<button type="button" class="button button-primary" id="wf-start-server">
							<span class="dashicons dashicons-controls-play"></span>
							<?php esc_html_e( 'Start Server', 'wordforge' ); ?>
						</button>
						<span id="wf-start-status" style="margin-left: 10px;"></span>
					</p>
				</div>
			<?php else : ?>
				<div class="wordforge-opencode-header">
					<span class="status-badge running">
						<span class="status-dot"></span>
						<?php esc_html_e( 'Running', 'wordforge' ); ?>
					</span>
					<span class="server-info">
						<?php echo esc_html( sprintf( __( 'Port %d', 'wordforge' ), $server_status['port'] ) ); ?>
					</span>
					<button type="button" class="button button-small" id="wf-stop-server">
						<?php esc_html_e( 'Stop Server', 'wordforge' ); ?>
					</button>
				</div>

				<div class="wordforge-opencode-frame-wrapper">
					<iframe 
						id="opencode-frame"
						src="<?php echo esc_url( $proxy_base ); ?>"
						class="wordforge-opencode-iframe"
						sandbox="allow-scripts allow-forms allow-same-origin"
					></iframe>
				</div>

				<div class="wordforge-opencode-fallback">
					<p><?php esc_html_e( 'If the interface above is not loading correctly:', 'wordforge' ); ?></p>
					<ul>
						<li>
							<strong><?php esc_html_e( 'Local access:', 'wordforge' ); ?></strong>
							<code><?php echo esc_html( $server_status['url'] ); ?></code>
						</li>
						<li>
							<strong><?php esc_html_e( 'SSH Tunnel:', 'wordforge' ); ?></strong>
							<code>ssh -L <?php echo esc_html( $server_status['port'] ); ?>:localhost:<?php echo esc_html( $server_status['port'] ); ?> your-server</code>
						</li>
					</ul>
				</div>
			<?php endif; ?>
		</div>

		<script>
		(function() {
			const restUrl = <?php echo wp_json_encode( rest_url( 'wordforge/v1' ) ); ?>;
			const nonce = <?php echo wp_json_encode( $nonce ); ?>;

			const apiCall = async (endpoint, method = 'POST') => {
				const response = await fetch(restUrl + endpoint, {
					method,
					headers: { 'X-WP-Nonce': nonce }
				});
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.error || data.message || 'Request failed');
				}
				return response.json();
			};

			document.getElementById('wf-start-server')?.addEventListener('click', async function() {
				const btn = this;
				const status = document.getElementById('wf-start-status');
				
				btn.disabled = true;
				status.innerHTML = '<span class="spinner is-active" style="float:none;"></span> Starting...';

				try {
					await apiCall('/opencode/start');
					status.innerHTML = '<span style="color:green;">✓ Started! Reloading...</span>';
					setTimeout(() => location.reload(), 1000);
				} catch (e) {
					status.innerHTML = '<span style="color:red;">✗ ' + e.message + '</span>';
					btn.disabled = false;
				}
			});

			document.getElementById('wf-stop-server')?.addEventListener('click', async function() {
				if (!confirm('Stop the OpenCode server?')) return;
				
				try {
					await apiCall('/opencode/stop');
					location.reload();
				} catch (e) {
					alert('Failed to stop: ' + e.message);
				}
			});
		})();
		</script>
		<?php
	}

	private function get_styles(): string {
		return '
			.wordforge-opencode-page { max-width: 1400px; }
			.wordforge-opencode-page h1 { display: flex; align-items: center; gap: 8px; }
			.wordforge-opencode-page h1 .dashicons { color: #2271b1; }
			
			.wordforge-opencode-notice { padding: 20px; background: #fff; border: 1px solid #c3c4c7; border-radius: 4px; margin: 20px 0; }
			.wordforge-opencode-notice.notice-warning { border-left: 4px solid #dba617; }
			.wordforge-opencode-notice.notice-info { border-left: 4px solid #72aee6; }
			.wordforge-opencode-notice p { margin: 0 0 10px; }
			.wordforge-opencode-notice .button .dashicons { margin-right: 4px; line-height: 1.4; }
			
			.wordforge-opencode-header { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: #fff; border: 1px solid #c3c4c7; border-radius: 4px 4px 0 0; margin-top: 20px; }
			.status-badge { display: flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
			.status-badge.running { background: #d4edda; color: #155724; }
			.status-badge .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #28a745; animation: pulse 2s infinite; }
			@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
			.server-info { color: #666; font-size: 13px; }
			
			.wordforge-opencode-frame-wrapper { border: 1px solid #c3c4c7; border-top: none; background: #1e1e1e; }
			.wordforge-opencode-iframe { width: 100%; height: 70vh; min-height: 500px; border: none; display: block; }
			
			.wordforge-opencode-fallback { margin-top: 16px; padding: 16px; background: #f6f7f7; border-radius: 4px; font-size: 13px; }
			.wordforge-opencode-fallback ul { margin: 8px 0 0 20px; }
			.wordforge-opencode-fallback li { margin: 6px 0; }
			.wordforge-opencode-fallback code { background: #fff; padding: 4px 8px; border-radius: 3px; }
		';
	}
}
