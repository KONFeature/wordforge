<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ServerProcess;

class WidgetManager {

	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'maybe_enqueue_widget' ) );
		add_action( 'admin_footer', array( $this, 'render_widget_container' ) );
	}

	public function maybe_enqueue_widget( string $hook ): void {
		if ( ! $this->should_show_widget_for_hook( $hook ) ) {
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

		echo '<div id="wordforge-widget-root"></div>';
	}

	private function should_show_widget_for_hook( string $hook ): bool {
		if ( 'edit.php' === $hook ) {
			$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : 'post';

			if ( 'product' === $post_type && function_exists( 'wc_get_product' ) ) {
				return true;
			}

			if ( in_array( $post_type, array( 'post', 'page' ), true ) ) {
				return true;
			}

			return false;
		}

		if ( 'post.php' === $hook || 'post-new.php' === $hook ) {
			$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
			if ( $post_id ) {
				$post_type = get_post_type( $post_id );
				if ( 'product' === $post_type && function_exists( 'wc_get_product' ) ) {
					return true;
				}
			}

			$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : '';
			if ( 'product' === $post_type && function_exists( 'wc_get_product' ) ) {
				return true;
			}

			return false;
		}

		if ( 'upload.php' === $hook ) {
			return true;
		}

		return false;
	}

	private function should_show_widget_for_screen( \WP_Screen $screen ): bool {
		if ( 'edit-product' === $screen->id && function_exists( 'wc_get_product' ) ) {
			return true;
		}

		if ( 'product' === $screen->id && function_exists( 'wc_get_product' ) ) {
			return true;
		}

		if ( in_array( $screen->id, array( 'edit-post', 'edit-page', 'upload' ), true ) ) {
			return true;
		}

		return false;
	}

	private function enqueue_widget_assets( string $hook ): void {
		$asset_path = WORDFORGE_PLUGIN_DIR . 'assets/js/chat-widget.asset.php';
		if ( ! file_exists( $asset_path ) ) {
			return;
		}

		$asset_file   = include $asset_path;
		$vendor_asset = include WORDFORGE_PLUGIN_DIR . 'assets/js/wordforge-vendor.asset.php';

		wp_register_script(
			'wordforge-vendor',
			plugins_url( 'assets/js/wordforge-vendor.js', WORDFORGE_PLUGIN_FILE ),
			$vendor_asset['dependencies'],
			$vendor_asset['version'],
			true
		);

		$dependencies   = $asset_file['dependencies'];
		$dependencies[] = 'wordforge-vendor';

		wp_enqueue_script(
			'wordforge-chat-widget',
			plugins_url( 'assets/js/chat-widget.js', WORDFORGE_PLUGIN_FILE ),
			$dependencies,
			$asset_file['version'],
			true
		);

		wp_enqueue_style( 'wp-components' );

		wp_enqueue_style(
			'wordforge-chat-widget',
			plugins_url( 'assets/js/chat-widget.css', WORDFORGE_PLUGIN_FILE ),
			array( 'wp-components' ),
			$asset_file['version']
		);

		$context = ContextDetector::get_context( $hook );

		$config = array(
			'proxyUrl' => rest_url( 'wordforge/v1/opencode/proxy' ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'context'  => $context,
		);

		wp_add_inline_script(
			'wordforge-chat-widget',
			'window.wordforgeWidget = ' . wp_json_encode( $config ) . ';',
			'before'
		);
	}
}
