<?php
/**
 * Local OpenCode server configuration generator.
 *
 * Generates configuration for OpenCode running on the user's local machine,
 * connecting to WordPress via MCP (no wp-cli, no bash commands).
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class LocalServerConfig {

	public const RUNTIME_NODE = 'node';
	public const RUNTIME_BUN  = 'bun';
	public const RUNTIME_NONE = 'none';

	/**
	 * Generate the complete local OpenCode configuration.
	 *
	 * @param string $runtime The JavaScript runtime preference (node, bun, none).
	 * @return array The opencode.json configuration.
	 */
	public static function generate( string $runtime = self::RUNTIME_NODE ): array {
		$agents = self::build_agents_config( $runtime );

		$config = array(
			'$schema'       => 'https://opencode.ai/config.json',
			'default_agent' => 'wordpress-manager',
			'agent'         => $agents,
			'permission'    => array(
				'edit'               => 'deny',
				'external_directory' => 'deny',
				'bash'               => array(
					'*' => 'deny',
				),
			),
		);

		$provider_config = ProviderConfig::get_opencode_provider_config();
		if ( ! empty( $provider_config ) ) {
			$config['provider'] = $provider_config;
		}

		$mcp_config = self::get_mcp_config( $runtime );
		if ( $mcp_config ) {
			$config['mcp'] = array(
				'wordforge' => $mcp_config,
			);
		}

		return $config;
	}

	private static function build_agents_config( string $runtime ): array {
		$is_remote_mcp = self::RUNTIME_NONE === $runtime;

		$agents = array(
			'wordpress-manager'         => array(
				'mode'        => 'primary',
				'model'       => AgentConfig::get_effective_model( 'wordpress-manager' ),
				'description' => 'WordPress site orchestrator - delegates to specialized subagents for content, commerce, and auditing',
				'prompt'      => AgentPrompts::get_wordpress_manager_prompt( true, $is_remote_mcp ),
				'color'       => '#3858E9',
			),
			'wordpress-content-creator' => array(
				'mode'        => 'subagent',
				'model'       => AgentConfig::get_effective_model( 'wordpress-content-creator' ),
				'description' => 'Content creation specialist - blog posts, landing pages, legal pages with SEO optimization',
				'prompt'      => AgentPrompts::get_content_creator_prompt( true, $is_remote_mcp ),
				'color'       => '#10B981',
			),
			'wordpress-auditor'         => array(
				'mode'        => 'subagent',
				'model'       => AgentConfig::get_effective_model( 'wordpress-auditor' ),
				'description' => 'Site analysis specialist - SEO audits, content reviews, performance recommendations',
				'prompt'      => AgentPrompts::get_auditor_prompt( true, $is_remote_mcp ),
				'color'       => '#F59E0B',
			),
		);

		if ( class_exists( 'WooCommerce' ) ) {
			$agents['wordpress-commerce-manager'] = array(
				'mode'        => 'subagent',
				'model'       => AgentConfig::get_effective_model( 'wordpress-commerce-manager' ),
				'description' => 'WooCommerce specialist - product management, inventory, pricing',
				'prompt'      => AgentPrompts::get_commerce_manager_prompt( true, $is_remote_mcp ),
				'color'       => '#8B5CF6',
			);
		}

		return $agents;
	}

	private static function get_mcp_config( string $runtime ): ?array {
		$app_password_data = AppPasswordManager::get_or_create();
		if ( ! $app_password_data ) {
			return null;
		}

		if ( self::RUNTIME_NONE === $runtime ) {
			$mcp_url = \WordForge\get_endpoint_url();
			return array(
				'type'    => 'remote',
				'url'     => $mcp_url,
				'headers' => array(
					'Authorization' => 'Basic ' . $app_password_data['auth'],
				),
			);
		}

		$abilities_url = \rest_url( 'wp-abilities/v1' );
		return array(
			'type'        => 'local',
			'command'     => array( $runtime, './wordforge-mcp.cjs' ),
			'environment' => array(
				'WORDPRESS_URL'          => $abilities_url,
				'WORDPRESS_USERNAME'     => $app_password_data['username'],
				'WORDPRESS_APP_PASSWORD' => $app_password_data['password'],
			),
		);
	}

	/**
	 * Generate the AGENTS.md file content with WordPress context.
	 *
	 * @param string $runtime The JavaScript runtime preference (node, bun, none).
	 * @return string The AGENTS.md content.
	 */
	public static function generate_agents_md( string $runtime = self::RUNTIME_NODE ): string {
		$context = ContextProvider::get_global_context();

		$site_url   = $context['site']['url'] ?? \home_url();
		$site_name  = $context['site']['name'] ?? \get_bloginfo( 'name' );
		$wp_version = $context['site']['wp_version'] ?? \get_bloginfo( 'version' );
		$theme_name = $context['theme']['name'] ?? '';
		$theme_type = ! empty( $context['theme']['is_block_theme'] ) ? 'Block Theme (FSE)' : 'Classic Theme';
		$plugins    = $context['plugins']['active'] ?? array();
		$post_types = $context['content_types']['post_types'] ?? array();
		$taxonomies = $context['content_types']['taxonomies'] ?? array();
		$woo_active = class_exists( 'WooCommerce' );
		$site_lang  = $context['site']['language'] ?? \get_locale();

		$plugin_list = '';
		foreach ( $plugins as $plugin ) {
			$plugin_list .= sprintf( "- %s (v%s)\n", $plugin['name'], $plugin['version'] );
		}

		$post_type_list = implode( ', ', array_column( $post_types, 'name' ) );
		$taxonomy_list  = implode( ', ', array_column( $taxonomies, 'name' ) );

		$woo_section = '';
		if ( $woo_active ) {
			$woo_section = <<<'MARKDOWN'

## WooCommerce

WooCommerce is active on this site. You have access to product management tools:
- `wordforge/list-products` - List products with filtering
- `wordforge/get-product` - Get product details
- `wordforge/save-product` - Create or update products
- `wordforge/delete-product` - Delete products

MARKDOWN;
		}

		$content = <<<MARKDOWN
# WordPress Site Configuration

This OpenCode project is configured to manage a WordPress site via the WordForge MCP connection.

## Site Information

| Property | Value |
|----------|-------|
| **Site Name** | {$site_name} |
| **Site URL** | {$site_url} |
| **WordPress Version** | {$wp_version} |
| **Language** | {$site_lang} |
| **Theme** | {$theme_name} ({$theme_type}) |

## Active Plugins

{$plugin_list}

## Content Types

**Post Types**: {$post_type_list}

**Taxonomies**: {$taxonomy_list}
{$woo_section}
## Available MCP Tools

### Content Management
- `wordforge/list-content` - List posts, pages, or custom post types
- `wordforge/get-content` - Get a single content item by ID or slug
- `wordforge/save-content` - Create or update content
- `wordforge/delete-content` - Delete or trash content

### Media Library
- `wordforge/list-media` - List media library items
- `wordforge/get-media` - Get media details including all sizes
- `wordforge/upload-media` - Upload media from URL or base64
- `wordforge/update-media` - Update alt text, title, caption, description
- `wordforge/delete-media` - Delete a media item

### Taxonomy
- `wordforge/list-terms` - List terms for any taxonomy
- `wordforge/save-term` - Create or update a term
- `wordforge/delete-term` - Delete a term

### Gutenberg Blocks
- `wordforge/get-page-blocks` - Get block structure of a page
- `wordforge/update-page-blocks` - Update page blocks

### Templates (FSE)
- `wordforge/list-templates` - List block templates and template parts
- `wordforge/get-template` - Get template with block content
- `wordforge/update-template` - Update template content

### Theme Styling
- `wordforge/get-styles` - Get theme.json / block styles
- `wordforge/update-global-styles` - Update global styles

## Important Notes

1. **No Shell Access**: This local configuration does not have shell or file system access to the WordPress server. All operations must go through the MCP tools.

2. **Authentication**: The MCP connection uses application password authentication. Keep your `opencode.json` file secure.

3. **Content Language**: When creating content, use **{$site_lang}** as the primary language unless instructed otherwise.

4. **Gutenberg Blocks**: Always format content using WordPress Gutenberg block syntax when creating or updating pages/posts.

## Getting Started

1. Open this folder in OpenCode (TUI or Desktop)
2. Start a conversation about your WordPress site
3. Use natural language to manage content, media, and settings

Example prompts:
- "List all published blog posts from this month"
- "Create a new landing page about our services"
- "Upload this image and add it to the media library"
- "Update the SEO metadata for the About page"
MARKDOWN;

		return self::RUNTIME_NONE === $runtime ? $content : self::transform_tool_names_for_local( $content );
	}

	private static function transform_tool_names_for_local( string $content ): string {
		return preg_replace_callback(
			'/wordforge\/([a-z-]+)/',
			function ( $matches ) {
				return 'wordpress_' . str_replace( '-', '_', $matches[1] );
			},
			$content
		);
	}

	public static function get_settings(): array {
		$settings = \get_option( 'wordforge_local_server', array() );

		return array(
			'port'    => $settings['port'] ?? 4096,
			'enabled' => $settings['enabled'] ?? true,
			'runtime' => $settings['runtime'] ?? self::RUNTIME_NODE,
		);
	}

	public static function save_settings( array $settings ): bool {
		$existing  = self::get_settings();
		$sanitized = array(
			'port'    => isset( $settings['port'] ) ? \absint( $settings['port'] ) : $existing['port'],
			'enabled' => isset( $settings['enabled'] ) ? (bool) $settings['enabled'] : $existing['enabled'],
			'runtime' => isset( $settings['runtime'] ) ? \sanitize_text_field( $settings['runtime'] ) : $existing['runtime'],
		);

		$sanitized['port'] = max( 1024, min( 65535, $sanitized['port'] ) );

		$valid_runtimes = array( self::RUNTIME_NODE, self::RUNTIME_BUN, self::RUNTIME_NONE );
		if ( ! in_array( $sanitized['runtime'], $valid_runtimes, true ) ) {
			$sanitized['runtime'] = self::RUNTIME_NODE;
		}

		return \update_option( 'wordforge_local_server', $sanitized, false );
	}

	public static function get_mcp_server_binary_path(): ?string {
		$binary_path = WORDFORGE_PLUGIN_DIR . 'assets/bin/wordforge-mcp.cjs';
		return file_exists( $binary_path ) ? $binary_path : null;
	}
}
