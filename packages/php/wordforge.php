<?php
/**
 * Plugin Name: WordForge
 * Plugin URI: https://github.com/konfeature/wordforge
 * Description: Forge your WordPress site through conversation - MCP-powered content, commerce, and design management
 * Version: 1.4.4
 * Author: KONFeature
 * Author URI: https://nivelais.com
 * License: MIT
 * License URI: https://opensource.org/licenses/MIT
 * Text Domain: wordforge
 * Domain Path: /languages
 * Requires at least: 6.8
 * Requires PHP: 8.0
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WORDFORGE_VERSION', '1.4.4' );
define( 'WORDFORGE_PLUGIN_FILE', __FILE__ );
define( 'WORDFORGE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WORDFORGE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

$autoloader_loaded = false;
if ( file_exists( WORDFORGE_PLUGIN_DIR . 'vendor/autoload_packages.php' ) ) {
	require_once WORDFORGE_PLUGIN_DIR . 'vendor/autoload_packages.php';
	$autoloader_loaded = true;
} elseif ( file_exists( WORDFORGE_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
	require_once WORDFORGE_PLUGIN_DIR . 'vendor/autoload.php';
	$autoloader_loaded = true;
}

spl_autoload_register(
	function ( string $class ): void {
		$prefix   = 'WordForge\\';
		$base_dir = WORDFORGE_PLUGIN_DIR . 'includes/';

		$len = strlen( $prefix );
		if ( strncmp( $prefix, $class, $len ) !== 0 ) {
				return;
		}

		$relative_class = substr( $class, $len );
		$file           = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

		if ( file_exists( $file ) ) {
			require_once $file;
		}
	}
);

if ( $autoloader_loaded ) {
	$abilities_api_file = WORDFORGE_PLUGIN_DIR . 'vendor/wordpress/abilities-api/abilities-api.php';
	if ( file_exists( $abilities_api_file ) && ! defined( 'WP_ABILITIES_API_DIR' ) ) {
		require_once $abilities_api_file;
	}

	$mcp_adapter_file = WORDFORGE_PLUGIN_DIR . 'vendor/wordpress/mcp-adapter/mcp-adapter.php';
	if ( file_exists( $mcp_adapter_file ) && ! defined( 'WP_MCP_DIR' ) ) {
		if ( ! defined( 'WP_MCP_AUTOLOAD' ) ) {
			define( 'WP_MCP_AUTOLOAD', false );
		}
		require_once $mcp_adapter_file;
	}
}

function get_settings(): array {
	return wp_parse_args(
		get_option( 'wordforge_settings', array() ),
		array(
			'mcp_enabled'             => true,
			'mcp_namespace'           => 'wordforge',
			'mcp_route'               => 'mcp',
			'auto_shutdown_enabled'   => true,
			'auto_shutdown_threshold' => 1800,
		)
	);
}

function get_endpoint_url(): string {
	return Mcp\ServerManager::get_endpoint_url();
}

function init(): void {
	new Admin\MenuManager();
	new Admin\SettingsPage();
	new Admin\OpenCodeController();
	new Admin\DesktopConnectionController();
	new Admin\WidgetManager();
	new Admin\EditorSidebarManager();

	OpenCode\ActivityMonitor::schedule_cron();
	OpenCode\ConfigChangeDetector::register_hooks();

	if ( ! class_exists( 'WP\\MCP\\Core\\McpAdapter' ) ) {
		add_action( 'admin_notices', __NAMESPACE__ . '\\missing_mcp_adapter_notice' );
		return;
	}

	new Mcp\ServerManager();

	add_action( 'wp_abilities_api_categories_init', __NAMESPACE__ . '\\register_ability_categories' );
	add_action( 'wp_abilities_api_init', __NAMESPACE__ . '\\register_abilities' );
}

/**
 * Register WordForge ability categories.
 * Categories must be registered before abilities that use them.
 */
function register_ability_categories(): void {
	if ( ! function_exists( 'wp_register_ability_category' ) ) {
		return;
	}

	wp_register_ability_category(
		'wordforge-content',
		array(
			'label'       => __( 'Content Management', 'wordforge' ),
			'description' => __( 'Abilities for managing WordPress posts, pages, and custom post types.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-blocks',
		array(
			'label'       => __( 'Block Editor', 'wordforge' ),
			'description' => __( 'Abilities for working with Gutenberg blocks and page structures.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-styles',
		array(
			'label'       => __( 'Theme Styling', 'wordforge' ),
			'description' => __( 'Abilities for managing global styles and block styles.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-prompts',
		array(
			'label'       => __( 'AI Prompts', 'wordforge' ),
			'description' => __( 'Prompt templates for AI-assisted content generation and optimization.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-media',
		array(
			'label'       => __( 'Media Library', 'wordforge' ),
			'description' => __( 'Abilities for managing media files, images, and attachments.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-taxonomy',
		array(
			'label'       => __( 'Taxonomy Management', 'wordforge' ),
			'description' => __( 'Abilities for managing categories, tags, and custom taxonomies.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-templates',
		array(
			'label'       => __( 'Templates', 'wordforge' ),
			'description' => __( 'Abilities for managing block templates and template parts (FSE).', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-users',
		array(
			'label'       => __( 'User Management', 'wordforge' ),
			'description' => __( 'Abilities for listing and retrieving WordPress user information.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-comments',
		array(
			'label'       => __( 'Comments', 'wordforge' ),
			'description' => __( 'Abilities for managing WordPress comments and moderation.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-settings',
		array(
			'label'       => __( 'Site Settings', 'wordforge' ),
			'description' => __( 'Abilities for reading and updating WordPress site settings.', 'wordforge' ),
		)
	);

	wp_register_ability_category(
		'wordforge-analytics',
		array(
			'label'       => __( 'Analytics', 'wordforge' ),
			'description' => __( 'Abilities for retrieving site statistics and analytics data.', 'wordforge' ),
		)
	);

	if ( is_woocommerce_active() ) {
		wp_register_ability_category(
			'wordforge-woocommerce',
			array(
				'label'       => __( 'WooCommerce', 'wordforge' ),
				'description' => __( 'Abilities for managing WooCommerce products and store data.', 'wordforge' ),
			)
		);
	}
}

function register_abilities(): void {
	$registry = new AbilityRegistry();
	$registry->register_all();
}

function missing_mcp_adapter_notice(): void {
	?>
	<div class="notice notice-error">
		<p>
			<strong><?php esc_html_e( 'WordForge:', 'wordforge' ); ?></strong>
			<?php esc_html_e( 'MCP Adapter failed to load. Please run composer install.', 'wordforge' ); ?>
		</p>
	</div>
	<?php
}

function is_woocommerce_active(): bool {
	return class_exists( 'WooCommerce' );
}

function is_jetpack_active(): bool {
	return class_exists( 'Jetpack' ) || class_exists( 'Automattic\Jetpack\Stats\WPCOM_Stats' );
}

add_action( 'plugins_loaded', __NAMESPACE__ . '\\init' );

add_filter(
	'cron_schedules',
	function ( array $schedules ): array {
		$schedules[ OpenCode\ActivityMonitor::get_cron_interval() ] = array(
			'interval' => 300,
			'display'  => __( 'Every 5 Minutes', 'wordforge' ),
		);
		return $schedules;
	}
);

add_action( OpenCode\ActivityMonitor::get_cron_hook(), array( OpenCode\ActivityMonitor::class, 'check_and_stop_if_inactive' ) );

/**
 * Add Settings link to plugins page.
 *
 * @param array $links Existing plugin action links.
 * @return array Modified links with Settings added.
 */
function add_settings_link( array $links ): array {
	$settings_link = sprintf(
		'<a href="%s">%s</a>',
		esc_url( admin_url( 'admin.php?page=' . Admin\MenuManager::MENU_SLUG ) ),
		esc_html__( 'Settings', 'wordforge' )
	);
	array_unshift( $links, $settings_link );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), __NAMESPACE__ . '\\add_settings_link' );

function cleanup_opencode_on_deactivate(): void {
	OpenCode\ServerProcess::stop();
	OpenCode\ActivityMonitor::unschedule_cron();
}
register_deactivation_hook( __FILE__, __NAMESPACE__ . '\\cleanup_opencode_on_deactivate' );

function schedule_activity_monitor(): void {
	OpenCode\ActivityMonitor::schedule_cron();
}
register_activation_hook( __FILE__, __NAMESPACE__ . '\\schedule_activity_monitor' );

function cleanup_opencode_on_uninstall(): void {
	OpenCode\ServerProcess::stop();
	OpenCode\ServerProcess::revoke_app_password();
	OpenCode\BinaryManager::cleanup();
	delete_option( 'wordforge_settings' );
}

if ( ! function_exists( __NAMESPACE__ . '\\wordforge_uninstall' ) ) {
	function wordforge_uninstall(): void {
		\WordForge\cleanup_opencode_on_uninstall();
	}
}
register_uninstall_hook( __FILE__, __NAMESPACE__ . '\\wordforge_uninstall' );
