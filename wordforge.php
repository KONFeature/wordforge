<?php
/**
 * Plugin Name: WordForge
 * Plugin URI: https://github.com/konfeature/wordforge
 * Description: Forge your WordPress site through conversation - MCP-powered content, commerce, and design management
 * Version: 1.0.0
 * Author: KONFeature
 * Author URI: https://nivelais.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wordforge
 * Domain Path: /languages
 * Requires at least: 6.4
 * Requires PHP: 8.0
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'WORDFORGE_VERSION', '1.0.0' );
define( 'WORDFORGE_PLUGIN_FILE', __FILE__ );
define( 'WORDFORGE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WORDFORGE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

if ( file_exists( WORDFORGE_PLUGIN_DIR . 'vendor/autoload_packages.php' ) ) {
    require_once WORDFORGE_PLUGIN_DIR . 'vendor/autoload_packages.php';
} elseif ( file_exists( WORDFORGE_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
    require_once WORDFORGE_PLUGIN_DIR . 'vendor/autoload.php';
} else {
    spl_autoload_register( function ( string $class ): void {
        $prefix = 'WordForge\\';
        $base_dir = WORDFORGE_PLUGIN_DIR . 'includes/';

        $len = strlen( $prefix );
        if ( strncmp( $prefix, $class, $len ) !== 0 ) {
            return;
        }

        $relative_class = substr( $class, $len );
        $file = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

        if ( file_exists( $file ) ) {
            require_once $file;
        }
    } );
}

// Bootstrap bundled dependencies (order matters: abilities-api before mcp-adapter)
$abilities_api_file = WORDFORGE_PLUGIN_DIR . 'vendor/wordpress/abilities-api/abilities-api.php';
if ( file_exists( $abilities_api_file ) && ! defined( 'WP_ABILITIES_API_DIR' ) ) {
    require_once $abilities_api_file;
}

$mcp_adapter_file = WORDFORGE_PLUGIN_DIR . 'vendor/wordpress/mcp-adapter/mcp-adapter.php';
if ( file_exists( $mcp_adapter_file ) && ! defined( 'WP_MCP_DIR' ) ) {
    require_once $mcp_adapter_file;
}

function get_settings(): array {
    return wp_parse_args(
        get_option( 'wordforge_settings', [] ),
        [
            'namespace' => 'wordforge/v1',
            'route'     => 'mcp',
        ]
    );
}

function get_endpoint_url(): string {
    $settings = get_settings();
    return rest_url( $settings['namespace'] . '/' . $settings['route'] );
}

function init(): void {
    new Admin\SettingsPage();

    if ( ! class_exists( 'WP\\MCP\\Core\\McpAdapter' ) ) {
        add_action( 'admin_notices', __NAMESPACE__ . '\\missing_mcp_adapter_notice' );
        return;
    }

    add_action( 'mcp_adapter_init', __NAMESPACE__ . '\\setup_mcp_server' );
}

function setup_mcp_server( $adapter ): void {
    $registry = new AbilityRegistry();
    $registry->register_all();

    $settings = get_settings();
    $ability_names = $registry->get_ability_names();

    $adapter->create_server(
        'wordforge',
        $settings['namespace'],
        $settings['route'],
        'WordForge',
        'Forge your WordPress site through conversation',
        WORDFORGE_VERSION,
        [ \WP\MCP\Transport\HttpTransport::class ],
        \WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler::class,
        \WP\MCP\Infrastructure\Observability\NullMcpObservabilityHandler::class,
        $ability_names,
        [],
        []
    );
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

add_action( 'plugins_loaded', __NAMESPACE__ . '\\init' );
