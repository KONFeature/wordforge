<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\AgentConfig;
use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ProviderConfig;
use WordForge\OpenCode\ServerProcess;

class SettingsPage {

	public function __construct() {
		add_action( 'admin_init', [ $this, 'register_settings' ] );
	}

	public function register_settings(): void {
		register_setting( 'wordforge_settings', 'wordforge_settings', [
			'type'              => 'array',
			'sanitize_callback' => [ $this, 'sanitize_settings' ],
			'default'           => [
				'mcp_enabled'   => true,
				'mcp_namespace' => 'wordforge',
				'mcp_route'     => 'mcp',
			],
		] );
	}

	public function sanitize_settings( array $input ): array {
		return [
			'mcp_enabled'   => ! empty( $input['mcp_enabled'] ),
			'mcp_namespace' => sanitize_text_field( $input['mcp_namespace'] ?? 'wordforge' ),
			'mcp_route'     => sanitize_text_field( $input['mcp_route'] ?? 'mcp' ),
		];
	}

	public function render(): void {
		$this->enqueue_assets();
		?>
		<div class="wrap wordforge-wrap">
			<h1>
				<span class="wordforge-logo">⚒️</span>
				<?php esc_html_e( 'WordForge Settings', 'wordforge' ); ?>
			</h1>

			<p class="wordforge-tagline">
				<?php esc_html_e( 'Forge your WordPress site through conversation.', 'wordforge' ); ?>
			</p>

			<div id="wordforge-settings-root"></div>
		</div>
		<?php
	}

	private function enqueue_assets(): void {
		$asset_file = include WORDFORGE_PLUGIN_DIR . 'assets/js/settings.asset.php';

		\wp_enqueue_script(
			'wordforge-settings',
			\plugins_url( 'assets/js/settings.js', WORDFORGE_PLUGIN_FILE ),
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);

		\wp_enqueue_style( 'wp-components' );

		\wp_enqueue_style(
			'wordforge-settings',
			\plugins_url( 'assets/js/settings.css', WORDFORGE_PLUGIN_FILE ),
			[ 'wp-components' ],
			$asset_file['version']
		);

		$mcp_active    = class_exists( 'WP\\MCP\\Core\\McpAdapter' );
		$woo_active    = \WordForge\is_woocommerce_active();
		$settings      = \WordForge\get_settings();
		$binary_info   = BinaryManager::get_platform_info();
		$server_status = ServerProcess::get_status();
		$abilities     = $this->get_registered_abilities();

		$config = [
			'restUrl'      => \rest_url( 'wordforge/v1' ),
			'nonce'        => \wp_create_nonce( 'wp_rest' ),
			'optionsNonce' => \wp_create_nonce( 'wordforge_settings-options' ),
			'settings'     => [
				'pluginVersion'  => WORDFORGE_VERSION,
				'binaryInstalled' => $binary_info['is_installed'],
				'serverRunning'  => $server_status['running'],
				'serverPort'     => $server_status['port'] ?? null,
				'mcpEnabled'     => $settings['mcp_enabled'] ?? true,
				'mcpNamespace'   => $settings['mcp_namespace'] ?? 'wordforge',
				'mcpRoute'       => $settings['mcp_route'] ?? 'mcp',
				'mcpEndpoint'    => \WordForge\get_endpoint_url(),
				'serverId'       => \WordForge\Mcp\ServerManager::get_server_id(),
				'platformInfo'   => [
					'os'           => $binary_info['os'],
					'arch'         => $binary_info['arch'],
					'binary_name'  => $binary_info['binary_name'],
					'is_installed' => $binary_info['is_installed'],
					'install_path' => $binary_info['install_path'],
					'version'      => $binary_info['version'] ?? null,
				],
			],
			'abilities'    => $abilities,
			'providers'    => ProviderConfig::get_providers_for_display(),
			'agents'       => AgentConfig::get_agents_for_display(),
			'integrations' => [
				'mcpAdapter'  => $mcp_active,
				'woocommerce' => $woo_active,
			],
			'i18n'            => [],
		];

		\wp_add_inline_script(
			'wordforge-settings',
			'window.wordforgeSettings = ' . \wp_json_encode( $config ) . ';',
			'before'
		);
	}

	private function get_registered_abilities(): array {
		return [
			'Content'     => [
				[ 'name' => 'wordforge/list-content', 'description' => 'List posts, pages, CPTs' ],
				[ 'name' => 'wordforge/get-content', 'description' => 'Get single content item' ],
				[ 'name' => 'wordforge/save-content', 'description' => 'Create or update content' ],
				[ 'name' => 'wordforge/delete-content', 'description' => 'Delete content' ],
			],
			'Media'       => [
				[ 'name' => 'wordforge/list-media', 'description' => 'List media library items' ],
				[ 'name' => 'wordforge/get-media', 'description' => 'Get media details' ],
				[ 'name' => 'wordforge/upload-media', 'description' => 'Upload from URL or base64' ],
				[ 'name' => 'wordforge/update-media', 'description' => 'Update alt text, caption' ],
				[ 'name' => 'wordforge/delete-media', 'description' => 'Delete media item' ],
			],
			'Taxonomy'    => [
				[ 'name' => 'wordforge/list-terms', 'description' => 'List categories, tags, etc.' ],
				[ 'name' => 'wordforge/save-term', 'description' => 'Create or update term' ],
				[ 'name' => 'wordforge/delete-term', 'description' => 'Delete term' ],
			],
			'Blocks'      => [
				[ 'name' => 'wordforge/get-page-blocks', 'description' => 'Get page block structure' ],
				[ 'name' => 'wordforge/update-page-blocks', 'description' => 'Update page blocks' ],
			],
			'Templates'   => [
				[ 'name' => 'wordforge/list-templates', 'description' => 'List block templates (FSE)' ],
				[ 'name' => 'wordforge/get-template', 'description' => 'Get template with blocks' ],
				[ 'name' => 'wordforge/update-template', 'description' => 'Update template content' ],
			],
			'Styles'      => [
				[ 'name' => 'wordforge/get-global-styles', 'description' => 'Get theme.json styles' ],
				[ 'name' => 'wordforge/update-global-styles', 'description' => 'Update global styles' ],
				[ 'name' => 'wordforge/get-block-styles', 'description' => 'Get block style variations' ],
			],
			'Prompts'     => [
				[ 'name' => 'wordforge/generate-content', 'description' => 'Generate blog posts, pages' ],
				[ 'name' => 'wordforge/review-content', 'description' => 'Review and improve content' ],
				[ 'name' => 'wordforge/seo-optimization', 'description' => 'Analyze content for SEO' ],
			],
			'WooCommerce' => [
				[ 'name' => 'wordforge/list-products', 'description' => 'List products' ],
				[ 'name' => 'wordforge/get-product', 'description' => 'Get product details' ],
				[ 'name' => 'wordforge/save-product', 'description' => 'Create or update product' ],
				[ 'name' => 'wordforge/delete-product', 'description' => 'Delete product' ],
			],
		];
	}
}
