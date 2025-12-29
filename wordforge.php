<?php
/**
 * Plugin Name: WordForge
 * Plugin URI: https://github.com/konfeature/wordforge
 * Description: Forge your WordPress site through conversation - MCP-powered content, commerce, and design management
 * Version: 1.1.0
 * Author: KONFeature
 * Author URI: https://nivelais.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
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

define( 'WORDFORGE_VERSION', '1.1.0' );
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
        get_option( 'wordforge_settings', [] ),
        [
            'mcp_enabled'   => true,
            'mcp_namespace' => 'wordforge',
            'mcp_route'     => 'mcp',
        ]
    );
}

function get_endpoint_url(): string {
    return Mcp\ServerManager::get_endpoint_url();
}

function init(): void {
    new Admin\SettingsPage();

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
        [
            'label'       => __( 'Content Management', 'wordforge' ),
            'description' => __( 'Abilities for managing WordPress posts, pages, and custom post types.', 'wordforge' ),
        ]
    );

    wp_register_ability_category(
        'wordforge-blocks',
        [
            'label'       => __( 'Block Editor', 'wordforge' ),
            'description' => __( 'Abilities for working with Gutenberg blocks and page structures.', 'wordforge' ),
        ]
    );

    wp_register_ability_category(
        'wordforge-styles',
        [
            'label'       => __( 'Theme Styling', 'wordforge' ),
            'description' => __( 'Abilities for managing global styles and block styles.', 'wordforge' ),
        ]
    );

    wp_register_ability_category(
        'wordforge-prompts',
        [
            'label'       => __( 'AI Prompts', 'wordforge' ),
            'description' => __( 'Prompt templates for AI-assisted content generation and optimization.', 'wordforge' ),
        ]
    );

    wp_register_ability_category(
        'wordforge-media',
        [
            'label'       => __( 'Media Library', 'wordforge' ),
            'description' => __( 'Abilities for managing media files, images, and attachments.', 'wordforge' ),
        ]
    );

    wp_register_ability_category(
        'wordforge-taxonomy',
        [
            'label'       => __( 'Taxonomy Management', 'wordforge' ),
            'description' => __( 'Abilities for managing categories, tags, and custom taxonomies.', 'wordforge' ),
        ]
    );

    wp_register_ability_category(
        'wordforge-templates',
        [
            'label'       => __( 'Templates', 'wordforge' ),
            'description' => __( 'Abilities for managing block templates and template parts (FSE).', 'wordforge' ),
        ]
    );

    if ( is_woocommerce_active() ) {
        wp_register_ability_category(
            'wordforge-woocommerce',
            [
                'label'       => __( 'WooCommerce', 'wordforge' ),
                'description' => __( 'Abilities for managing WooCommerce products and store data.', 'wordforge' ),
            ]
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

add_action( 'plugins_loaded', __NAMESPACE__ . '\\init' );

/**
 * Add Settings link to plugins page.
 *
 * @param array $links Existing plugin action links.
 * @return array Modified links with Settings added.
 */
function add_settings_link( array $links ): array {
    $settings_link = sprintf(
        '<a href="%s">%s</a>',
        esc_url( admin_url( 'options-general.php?page=wordforge' ) ),
        esc_html__( 'Settings', 'wordforge' )
    );
    array_unshift( $links, $settings_link );
    return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), __NAMESPACE__ . '\\add_settings_link' );
