<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ServerProcess;

class WidgetManager {

	public function __construct() {
		add_action( 'admin_enqueue_scripts', [ $this, 'maybe_enqueue_widget' ] );
		add_action( 'admin_footer', [ $this, 'render_widget_container' ] );
	}

	public function maybe_enqueue_widget( string $hook ): void {
		if ( ! $this->should_show_widget_for_hook( $hook ) ) {
			return;
		}

		if ( ! $this->is_opencode_ready() ) {
			return;
		}

		$this->enqueue_widget_assets( $hook );
	}

	public function render_widget_container(): void {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return;
		}

		if ( ! $this->should_show_widget_for_screen( $screen ) ) {
			return;
		}

		if ( ! $this->is_opencode_ready() ) {
			return;
		}

		echo '<div id="wordforge-widget-root"></div>';
	}

	private function should_show_widget_for_hook( string $hook ): bool {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return false;
		}

		if ( 'edit.php' === $hook ) {
			$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : 'post';
			return 'product' === $post_type;
		}

		if ( 'post.php' === $hook || 'post-new.php' === $hook ) {
			$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
			if ( $post_id ) {
				return 'product' === get_post_type( $post_id );
			}
			$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : '';
			return 'product' === $post_type;
		}

		return false;
	}

	private function should_show_widget_for_screen( \WP_Screen $screen ): bool {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return false;
		}

		if ( 'edit-product' === $screen->id ) {
			return true;
		}

		if ( 'product' === $screen->id ) {
			return true;
		}

		return false;
	}

	private function is_opencode_ready(): bool {
		$binary_info   = BinaryManager::get_platform_info();
		$server_status = ServerProcess::get_status();
		return $binary_info['is_installed'] && $server_status['running'];
	}

	private function enqueue_widget_assets( string $hook ): void {
		$asset_path = WORDFORGE_PLUGIN_DIR . 'assets/js/chat-widget.asset.php';
		if ( ! file_exists( $asset_path ) ) {
			return;
		}

		$asset_file = include $asset_path;

		wp_enqueue_script(
			'wordforge-chat-widget',
			plugins_url( 'assets/js/chat-widget.js', WORDFORGE_PLUGIN_FILE ),
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);

		wp_enqueue_style( 'wp-components' );

		wp_enqueue_style(
			'wordforge-chat-widget',
			plugins_url( 'assets/js/chat-widget.css', WORDFORGE_PLUGIN_FILE ),
			[ 'wp-components' ],
			$asset_file['version']
		);

		$context       = ContextDetector::get_context( $hook );
		$server_status = ServerProcess::get_status();

		$config = [
			'proxyUrl'     => rest_url( 'wordforge/v1/opencode/proxy' ),
			'nonce'        => wp_create_nonce( 'wp_rest' ),
			'context'      => $context,
			'serverStatus' => $server_status,
		];

		wp_add_inline_script(
			'wordforge-chat-widget',
			'window.wordforgeWidget = ' . wp_json_encode( $config ) . ';',
			'before'
		);
	}
}
