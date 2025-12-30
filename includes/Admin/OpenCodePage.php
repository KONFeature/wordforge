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
				<?php esc_html_e( 'OpenCode AI', 'wordforge' ); ?>
			</h1>

			<?php if ( ! $is_ready ) : ?>
				<?php $this->render_not_ready( $binary_info, $server_status ); ?>
			<?php else : ?>
				<?php $this->render_wip( $server_status ); ?>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_not_ready( array $binary_info, array $server_status ): void {
		$settings_url = admin_url( 'admin.php?page=' . MenuManager::MENU_SLUG );
		?>
		<div class="wordforge-card" style="max-width: 600px;">
			<h2><?php esc_html_e( 'OpenCode Not Ready', 'wordforge' ); ?></h2>

			<table class="wordforge-status-table">
				<tr>
					<td><?php esc_html_e( 'Binary', 'wordforge' ); ?></td>
					<td>
						<?php if ( $binary_info['is_installed'] ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php esc_html_e( 'Installed', 'wordforge' ); ?></span>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-error"><?php esc_html_e( 'Not Installed', 'wordforge' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'Server', 'wordforge' ); ?></td>
					<td>
						<?php if ( $server_status['running'] ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php esc_html_e( 'Running', 'wordforge' ); ?></span>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-error"><?php esc_html_e( 'Stopped', 'wordforge' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
			</table>

			<p style="margin-top: 16px;">
				<?php if ( ! $binary_info['is_installed'] ) : ?>
					<?php esc_html_e( 'Download the OpenCode binary from Settings to get started.', 'wordforge' ); ?>
				<?php else : ?>
					<?php esc_html_e( 'Start the OpenCode server from Settings to use the AI assistant.', 'wordforge' ); ?>
				<?php endif; ?>
			</p>

			<p>
				<a href="<?php echo esc_url( $settings_url ); ?>" class="button button-primary">
					<span class="dashicons dashicons-admin-settings" style="margin-right: 4px; line-height: 1.4;"></span>
					<?php esc_html_e( 'Go to Settings', 'wordforge' ); ?>
				</a>
			</p>
		</div>
		<?php
	}

	private function render_wip( array $server_status ): void {
		?>
		<div class="wordforge-card" style="max-width: 600px;">
			<h2><?php esc_html_e( 'Work in Progress', 'wordforge' ); ?></h2>

			<div style="text-align: center; padding: 40px 0;">
				<span style="font-size: 64px;">🚧</span>
				<p style="font-size: 16px; color: #646970; margin: 16px 0 0;">
					<?php esc_html_e( 'The OpenCode chat interface is coming soon.', 'wordforge' ); ?>
				</p>
			</div>

			<table class="wordforge-status-table">
				<tr>
					<td><?php esc_html_e( 'Server Status', 'wordforge' ); ?></td>
					<td><span class="wordforge-badge wordforge-badge-success"><?php esc_html_e( 'Running', 'wordforge' ); ?></span></td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'Port', 'wordforge' ); ?></td>
					<td><code><?php echo esc_html( $server_status['port'] ); ?></code></td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'Local URL', 'wordforge' ); ?></td>
					<td><code><?php echo esc_html( $server_status['url'] ); ?></code></td>
				</tr>
			</table>
		</div>
		<?php
	}
}
