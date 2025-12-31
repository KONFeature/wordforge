<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ServerProcess;

class OpenCodePage {

	public function render(): void {
		$binary_info   = BinaryManager::get_platform_info();
		$server_status = ServerProcess::get_status();
		$is_ready      = $binary_info['is_installed'] && $server_status['running'];
		?>
		<div class="wrap wordforge-wrap">
			<h1>
				<span class="wordforge-logo">⚒️</span>
				<?php \esc_html_e( 'OpenCode AI', 'wordforge' ); ?>
			</h1>

			<?php if ( ! $is_ready ) : ?>
				<?php $this->render_not_ready( $binary_info, $server_status ); ?>
			<?php else : ?>
				<?php $this->render_opencode_frame(); ?>
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
					<?php \esc_html_e( 'Start the OpenCode server from Settings to use the AI assistant.', 'wordforge' ); ?>
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

	private function render_opencode_frame(): void {
		$proxy_url  = OpenCodeController::get_proxy_url_with_token();
		$iframe_src = 'https://app.opencode.ai?url=' . \urlencode( $proxy_url );
		?>
		<style>
			.wordforge-opencode-container {
				position: relative;
				width: 100%;
				height: calc(100vh - 100px);
				min-height: 600px;
				background: #1e1e1e;
				border-radius: 8px;
				overflow: hidden;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
			}
			.wordforge-opencode-frame {
				width: 100%;
				height: 100%;
				border: none;
			}
			.wordforge-opencode-loading {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				color: #fff;
				font-size: 16px;
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 12px;
			}
			.wordforge-opencode-loading .spinner {
				background-size: 24px 24px;
				width: 24px;
				height: 24px;
				float: none;
				margin: 0;
			}
			.wordforge-opencode-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 16px;
			}
			.wordforge-opencode-status {
				display: flex;
				align-items: center;
				gap: 8px;
				color: #50c878;
				font-size: 14px;
			}
			.wordforge-opencode-status::before {
				content: '';
				width: 8px;
				height: 8px;
				background: #50c878;
				border-radius: 50%;
			}
		</style>

		<div class="wordforge-opencode-header">
			<div class="wordforge-opencode-status">
				<?php \esc_html_e( 'Server Running', 'wordforge' ); ?>
			</div>
			<a href="<?php echo \esc_url( \admin_url( 'admin.php?page=' . MenuManager::MENU_SLUG ) ); ?>" class="button button-secondary">
				<?php \esc_html_e( 'Settings', 'wordforge' ); ?>
			</a>
		</div>

		<div class="wordforge-opencode-container">
			<div class="wordforge-opencode-loading" id="wordforge-loading">
				<span class="spinner is-active"></span>
				<span><?php \esc_html_e( 'Loading OpenCode...', 'wordforge' ); ?></span>
			</div>
			<iframe 
				id="wordforge-opencode-iframe"
				class="wordforge-opencode-frame" 
				src="<?php echo \esc_url( $iframe_src ); ?>"
				title="<?php \esc_attr_e( 'OpenCode AI Assistant', 'wordforge' ); ?>"
				onload="document.getElementById('wordforge-loading').style.display='none';"
			></iframe>
		</div>
		<?php
	}
}
