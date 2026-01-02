<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\ActivityMonitor;
use WordForge\OpenCode\AgentConfig;
use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ExecCapability;
use WordForge\OpenCode\LocalServerConfig;
use WordForge\OpenCode\ProviderConfig;
use WordForge\OpenCode\ServerProcess;

class SettingsPage {

	public function __construct() {
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	public function register_settings(): void {
		register_setting(
			'wordforge_settings',
			'wordforge_settings',
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default'           => array(
					'mcp_enabled'             => true,
					'mcp_namespace'           => 'wordforge',
					'mcp_route'               => 'mcp',
					'auto_shutdown_enabled'   => true,
					'auto_shutdown_threshold' => 1800,
				),
			)
		);
	}

	public function sanitize_settings( array $input ): array {
		$threshold = isset( $input['auto_shutdown_threshold'] )
			? absint( $input['auto_shutdown_threshold'] )
			: 1800;

		$threshold = max( 300, min( 86400, $threshold ) );

		return array(
			'mcp_enabled'             => ! empty( $input['mcp_enabled'] ),
			'mcp_namespace'           => sanitize_text_field( $input['mcp_namespace'] ?? 'wordforge' ),
			'mcp_route'               => sanitize_text_field( $input['mcp_route'] ?? 'mcp' ),
			'auto_shutdown_enabled'   => isset( $input['auto_shutdown_enabled'] ) ? (bool) $input['auto_shutdown_enabled'] : true,
			'auto_shutdown_threshold' => $threshold,
		);
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
		$asset_file   = include WORDFORGE_PLUGIN_DIR . 'assets/js/settings.asset.php';
		$vendor_asset = include WORDFORGE_PLUGIN_DIR . 'assets/js/wordforge-vendor.asset.php';

		\wp_register_script(
			'wordforge-vendor',
			\plugins_url( 'assets/js/wordforge-vendor.js', WORDFORGE_PLUGIN_FILE ),
			$vendor_asset['dependencies'],
			$vendor_asset['version'],
			true
		);

		$dependencies   = $asset_file['dependencies'];
		$dependencies[] = 'wordforge-vendor';

		\wp_enqueue_script(
			'wordforge-settings',
			\plugins_url( 'assets/js/settings.js', WORDFORGE_PLUGIN_FILE ),
			$dependencies,
			$asset_file['version'],
			true
		);

		\wp_enqueue_style( 'wp-components' );

		\wp_enqueue_style(
			'wordforge-settings',
			\plugins_url( 'assets/js/settings.css', WORDFORGE_PLUGIN_FILE ),
			array( 'wp-components' ),
			$asset_file['version']
		);

		$mcp_active    = class_exists( 'WP\\MCP\\Core\\McpAdapter' );
		$woo_active    = \WordForge\is_woocommerce_active();
		$settings      = \WordForge\get_settings();
		$binary_info   = BinaryManager::get_platform_info();
		$server_status = ServerProcess::get_status();
		$abilities     = $this->get_registered_abilities();

		$exec_capabilities  = ExecCapability::get_capabilities();
		$local_settings     = LocalServerConfig::get_settings();

		$config = array(
			'restUrl'             => \rest_url( 'wordforge/v1' ),
			'nonce'               => \wp_create_nonce( 'wp_rest' ),
			'optionsNonce'        => \wp_create_nonce( 'wordforge_settings-options' ),
			'settings'            => array(
				'pluginVersion'         => WORDFORGE_VERSION,
				'binaryInstalled'       => $binary_info['is_installed'],
				'serverRunning'         => $server_status['running'],
				'serverPort'            => $server_status['port'] ?? null,
				'mcpEnabled'            => $settings['mcp_enabled'] ?? true,
				'mcpNamespace'          => $settings['mcp_namespace'] ?? 'wordforge',
				'mcpRoute'              => $settings['mcp_route'] ?? 'mcp',
				'mcpEndpoint'           => \WordForge\get_endpoint_url(),
				'serverId'              => \WordForge\Mcp\ServerManager::get_server_id(),
				'autoShutdownEnabled'   => $settings['auto_shutdown_enabled'] ?? true,
				'autoShutdownThreshold' => $settings['auto_shutdown_threshold'] ?? 1800,
				'platformInfo'          => array(
					'os'           => $binary_info['os'],
					'arch'         => $binary_info['arch'],
					'binary_name'  => $binary_info['binary_name'],
					'is_installed' => $binary_info['is_installed'],
					'install_path' => $binary_info['install_path'],
					'version'      => $binary_info['version'] ?? null,
				),
				'execEnabled'           => $exec_capabilities['can_exec'],
				'localServerPort'       => $local_settings['port'],
				'localServerEnabled'    => $local_settings['enabled'],
			),
			'abilities'           => $abilities,
			'configuredProviders' => $exec_capabilities['can_exec'] ? ProviderConfig::get_configured_providers() : array(),
			'agents'              => $exec_capabilities['can_exec'] ? AgentConfig::get_agents_for_display() : array(),
			'activity'            => ActivityMonitor::get_status(),
			'integrations'        => array(
				'mcpAdapter'  => $mcp_active,
				'woocommerce' => $woo_active,
			),
			'i18n'                => array(),
		);

		\wp_add_inline_script(
			'wordforge-settings',
			'window.wordforgeSettings = ' . \wp_json_encode( $config ) . ';',
			'before'
		);
	}

	private function get_registered_abilities(): array {
		return array(
			'Content'     => array(
				array(
					'name'        => 'wordforge/list-content',
					'description' => 'List posts, pages, CPTs',
				),
				array(
					'name'        => 'wordforge/get-content',
					'description' => 'Get single content item',
				),
				array(
					'name'        => 'wordforge/save-content',
					'description' => 'Create or update content',
				),
				array(
					'name'        => 'wordforge/delete-content',
					'description' => 'Delete content',
				),
			),
			'Media'       => array(
				array(
					'name'        => 'wordforge/list-media',
					'description' => 'List media library items',
				),
				array(
					'name'        => 'wordforge/get-media',
					'description' => 'Get media details',
				),
				array(
					'name'        => 'wordforge/upload-media',
					'description' => 'Upload from URL or base64',
				),
				array(
					'name'        => 'wordforge/update-media',
					'description' => 'Update alt text, caption',
				),
				array(
					'name'        => 'wordforge/delete-media',
					'description' => 'Delete media item',
				),
			),
			'Taxonomy'    => array(
				array(
					'name'        => 'wordforge/list-terms',
					'description' => 'List categories, tags, etc.',
				),
				array(
					'name'        => 'wordforge/save-term',
					'description' => 'Create or update term',
				),
				array(
					'name'        => 'wordforge/delete-term',
					'description' => 'Delete term',
				),
			),
			'Blocks'      => array(
				array(
					'name'        => 'wordforge/get-page-blocks',
					'description' => 'Get page block structure',
				),
				array(
					'name'        => 'wordforge/update-page-blocks',
					'description' => 'Update page blocks',
				),
			),
			'Templates'   => array(
				array(
					'name'        => 'wordforge/list-templates',
					'description' => 'List block templates (FSE)',
				),
				array(
					'name'        => 'wordforge/get-template',
					'description' => 'Get template with blocks',
				),
				array(
					'name'        => 'wordforge/update-template',
					'description' => 'Update template content',
				),
			),
			'Styles'      => array(
				array(
					'name'        => 'wordforge/get-global-styles',
					'description' => 'Get theme.json styles',
				),
				array(
					'name'        => 'wordforge/update-global-styles',
					'description' => 'Update global styles',
				),
				array(
					'name'        => 'wordforge/get-block-styles',
					'description' => 'Get block style variations',
				),
			),
			'Prompts'     => array(
				array(
					'name'        => 'wordforge/generate-content',
					'description' => 'Generate blog posts, pages',
				),
				array(
					'name'        => 'wordforge/review-content',
					'description' => 'Review and improve content',
				),
				array(
					'name'        => 'wordforge/seo-optimization',
					'description' => 'Analyze content for SEO',
				),
			),
			'WooCommerce' => array(
				array(
					'name'        => 'wordforge/list-products',
					'description' => 'List products',
				),
				array(
					'name'        => 'wordforge/get-product',
					'description' => 'Get product details',
				),
				array(
					'name'        => 'wordforge/save-product',
					'description' => 'Create or update product',
				),
				array(
					'name'        => 'wordforge/delete-product',
					'description' => 'Delete product',
				),
			),
		);
	}
}
