<?php
/**
 * WordPress context provider for OpenCode agents.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

/**
 * Gathers WordPress context information for injection into OpenCode agents.
 */
class ContextProvider {

	/**
	 * Core abilities from the Abilities API that are always present.
	 */
	private const CORE_ABILITIES = array(
		'core/get-site-info',
		'core/get-user-info',
		'core/get-environment-info',
	);

	/**
	 * MCP Adapter abilities for dynamic ability discovery/execution.
	 */
	private const MCP_ADAPTER_ABILITIES = array(
		'mcp-adapter/discover-abilities',
		'mcp-adapter/execute-ability',
		'mcp-adapter/get-ability-info',
	);

	/**
	 * Get global WordPress context for OpenCode agents.
	 *
	 * This context is injected into agent prompts to give them awareness
	 * of the WordPress environment they're operating in.
	 *
	 * @return array<string, mixed> Global WordPress context.
	 */
	public static function get_global_context(): array {
		return array(
			'site'                   => self::get_site_info(),
			'theme'                  => self::get_theme_info(),
			'plugins'                => self::get_plugins_info(),
			'content_types'          => self::get_content_types(),
			'cli_tools'              => self::get_cli_tools(),
			'has_external_abilities' => self::has_external_abilities(),
		);
	}

	/**
	 * Get basic site information.
	 *
	 * @return array<string, string> Site information.
	 */
	private static function get_site_info(): array {
		return array(
			'name'           => get_bloginfo( 'name' ),
			'description'    => get_bloginfo( 'description' ),
			'url'            => get_site_url(),
			'home_url'       => get_home_url(),
			'admin_url'      => admin_url(),
			'wp_version'     => get_bloginfo( 'version' ),
			'language'       => get_bloginfo( 'language' ),
			'charset'        => get_bloginfo( 'charset' ),
			'root_directory' => untrailingslashit( ABSPATH ),
		);
	}

	/**
	 * Get active theme information.
	 *
	 * @return array<string, mixed> Theme information.
	 */
	private static function get_theme_info(): array {
		$theme  = wp_get_theme();
		$parent = $theme->parent();

		return array(
			'name'           => $theme->get( 'Name' ),
			'version'        => $theme->get( 'Version' ),
			'path'           => $theme->get_stylesheet_directory(),
			'template_path'  => $theme->get_template_directory(),
			'is_child_theme' => (bool) $parent,
			'parent_name'    => $parent ? $parent->get( 'Name' ) : null,
			'is_block_theme' => wp_is_block_theme(),
			'supports'       => array(
				'widgets'         => current_theme_supports( 'widgets' ),
				'menus'           => current_theme_supports( 'menus' ),
				'custom_logo'     => current_theme_supports( 'custom-logo' ),
				'title_tag'       => current_theme_supports( 'title-tag' ),
				'post_thumbnails' => current_theme_supports( 'post-thumbnails' ),
				'block_templates' => current_theme_supports( 'block-templates' ),
				'editor_styles'   => current_theme_supports( 'editor-styles' ),
			),
		);
	}

	/**
	 * Get installed and active plugins information.
	 *
	 * @return array<string, mixed> Plugins information.
	 */
	private static function get_plugins_info(): array {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$all_plugins    = get_plugins();
		$active_plugins = get_option( 'active_plugins', array() );

		$active = array();
		foreach ( $active_plugins as $plugin_path ) {
			if ( isset( $all_plugins[ $plugin_path ] ) ) {
				$plugin   = $all_plugins[ $plugin_path ];
				$active[] = array(
					'name'    => $plugin['Name'],
					'version' => $plugin['Version'],
					'path'    => WP_PLUGIN_DIR . '/' . dirname( $plugin_path ),
				);
			}
		}

		return array(
			'total'              => count( $all_plugins ),
			'active_count'       => count( $active ),
			'active'             => $active,
			'woocommerce_active' => class_exists( 'WooCommerce' ),
		);
	}

	/**
	 * Get registered content types (post types and taxonomies).
	 *
	 * @return array<string, array> Content types information.
	 */
	private static function get_content_types(): array {
		$post_types = get_post_types( array( 'public' => true ), 'objects' );
		$taxonomies = get_taxonomies( array( 'public' => true ), 'objects' );

		$types = array();
		foreach ( $post_types as $post_type ) {
			$types[] = array(
				'name'     => $post_type->name,
				'label'    => $post_type->label,
				'supports' => array_keys( get_all_post_type_supports( $post_type->name ) ),
			);
		}

		$taxs = array();
		foreach ( $taxonomies as $taxonomy ) {
			$taxs[] = array(
				'name'         => $taxonomy->name,
				'label'        => $taxonomy->label,
				'hierarchical' => $taxonomy->hierarchical,
			);
		}

		return array(
			'post_types' => $types,
			'taxonomies' => $taxs,
		);
	}

	/**
	 * Get available CLI tools.
	 *
	 * @return array<string, bool> CLI tools availability.
	 */
	private static function get_cli_tools(): array {
		return array(
			'wp_cli'   => self::has_command( 'wp' ),
			'composer' => self::has_command( 'composer' ),
		);
	}

	/**
	 * Check if a command is available in the system.
	 *
	 * @param string $command Command to check.
	 * @return bool Whether the command is available.
	 */
	private static function has_command( string $command ): bool {
		$check_cmd = PHP_OS_FAMILY === 'Windows' ? 'where' : 'which';
		exec( "{$check_cmd} {$command} 2>/dev/null", $output, $code );
		return 0 === $code;
	}

	/**
	 * Check if there are external abilities registered beyond core and MCP adapter abilities.
	 *
	 * External abilities are those registered by other plugins that provide
	 * functionality beyond the base WordPress abilities.
	 *
	 * @return bool True if external abilities exist.
	 */
	private static function has_external_abilities(): bool {
		if ( ! function_exists( 'wp_get_abilities' ) ) {
			return false;
		}

		$all_abilities = wp_get_abilities();
		$excluded      = array_merge( self::CORE_ABILITIES, self::MCP_ADAPTER_ABILITIES );

		foreach ( $all_abilities as $ability ) {
			$name = $ability->get_name();

			// Skip WordForge abilities - we're looking for OTHER plugins' abilities.
			if ( str_starts_with( $name, 'wordforge/' ) ) {
				continue;
			}

			if ( ! in_array( $name, $excluded, true ) ) {
				return true;
			}
		}

		return false;
	}
}
