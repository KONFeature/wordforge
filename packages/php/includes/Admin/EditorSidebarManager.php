<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\ExecCapability;

class EditorSidebarManager {

	public function __construct() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
	}

	public function enqueue_editor_assets(): void {
		if ( ! ExecCapability::can_exec() ) {
			return;
		}

		$asset_path = WORDFORGE_PLUGIN_DIR . 'assets/js/editor-sidebar.asset.php';
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
			'wordforge-editor-sidebar',
			plugins_url( 'assets/js/editor-sidebar.js', WORDFORGE_PLUGIN_FILE ),
			$dependencies,
			$asset_file['version'],
			true
		);

		wp_enqueue_style( 'wp-components' );

		wp_enqueue_style(
			'wordforge-editor-sidebar',
			plugins_url( 'assets/js/editor-sidebar.css', WORDFORGE_PLUGIN_FILE ),
			array( 'wp-components' ),
			$asset_file['version']
		);

		$config = array(
			'proxyUrl' => rest_url( 'wordforge/v1/opencode/proxy' ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
		);

		wp_add_inline_script(
			'wordforge-editor-sidebar',
			'window.wordforgeEditor = ' . wp_json_encode( $config ) . ';',
			'before'
		);
	}
}
