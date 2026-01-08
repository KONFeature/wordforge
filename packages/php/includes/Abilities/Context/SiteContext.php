<?php
/**
 * Site Context Ability - Comprehensive WordPress site discovery.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Context;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\CacheableTrait;
use WordForge\Abilities\Traits\PluginOptionsTrait;

/**
 * Provides comprehensive WordPress site context for AI understanding.
 */
class SiteContext extends AbstractAbility {

	use CacheableTrait;
	use PluginOptionsTrait;

	/**
	 * @return string
	 */
	public function get_category(): string {
		return 'wordforge-context';
	}

	/**
	 * @return bool
	 */
	protected function is_read_only(): bool {
		return true;
	}

	/**
	 * @return string
	 */
	public function get_title(): string {
		return __( 'Site Context', 'wordforge' );
	}

	/**
	 * @return string
	 */
	public function get_description(): string {
		return __( 'Get WordPress site context. LEVELS: simple, plugins, rest, full. Call once to understand available capabilities.', 'wordforge' );
	}

	/**
	 * @return string
	 */
	public function get_capability(): string {
		return 'edit_posts';
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'level' => array(
					'type'        => 'string',
					'description' => 'Detail level. simple=fast overview, plugins=+plugin info, rest=+API namespaces, full=everything.',
					'enum'        => array( 'simple', 'plugins', 'rest', 'full' ),
					'default'     => 'full',
				),
			),
		);
	}

	/**
	 * @param array<string, mixed> $args The input arguments.
	 * @return array<string, mixed>
	 */
	public function execute( array $args ): array {
		$level = $args['level'] ?? 'full';

		return $this->cached_success(
			'site_context',
			fn() => $this->build_context( $level ),
			300,
			array( 'level' => $level )
		);
	}

	/**
	 * @param string $level Detail level.
	 * @return array<string, mixed>
	 */
	private function build_context( string $level ): array {
		$context = array(
			'site'  => $this->get_site_info(),
			'theme' => $this->get_theme_info(),
		);

		if ( in_array( $level, array( 'plugins', 'rest', 'full' ), true ) ) {
			$context['plugins'] = $this->get_plugins_info();
		}

		if ( in_array( $level, array( 'rest', 'full' ), true ) ) {
			$context['rest_namespaces'] = $this->get_rest_namespaces();
		}

		if ( 'full' === $level ) {
			$context['content_types']    = $this->get_content_types();
			$context['taxonomies']       = $this->get_taxonomies();
			$context['block_categories'] = $this->get_block_categories();
			$context['writable_options'] = $this->get_writable_options();
		}

		return $context;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_site_info(): array {
		global $wp_version;

		$permalink = get_option( 'permalink_structure' );

		return array(
			'name'                => get_bloginfo( 'name' ),
			'description'         => get_bloginfo( 'description' ),
			'url'                 => home_url(),
			'admin_url'           => admin_url(),
			'wordpress_version'   => $wp_version,
			'language'            => get_locale(),
			'timezone'            => wp_timezone_string(),
			'is_multisite'        => is_multisite(),
			'permalink_structure' => $permalink ? $permalink : 'plain',
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_theme_info(): array {
		$theme = wp_get_theme();

		$info = array(
			'name'           => $theme->get( 'Name' ),
			'version'        => $theme->get( 'Version' ),
			'slug'           => $theme->get_stylesheet(),
			'is_block_theme' => wp_is_block_theme(),
		);

		if ( $theme->parent() ) {
			$info['parent_theme'] = array(
				'name' => $theme->parent()->get( 'Name' ),
				'slug' => $theme->parent()->get_stylesheet(),
			);
		}

		return $info;
	}

	/**
	 * @return array<array<string, mixed>>
	 */
	private function get_plugins_info(): array {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$active_plugins = get_option( 'active_plugins', array() );
		$all_plugins    = get_plugins();
		$result         = array();

		foreach ( $active_plugins as $plugin_file ) {
			if ( ! isset( $all_plugins[ $plugin_file ] ) ) {
				continue;
			}

			$plugin   = $all_plugins[ $plugin_file ];
			$result[] = array(
				'name'    => $plugin['Name'],
				'version' => $plugin['Version'],
				'slug'    => dirname( $plugin_file ),
			);
		}

		return $result;
	}

	/**
	 * @return array<string>
	 */
	private function get_rest_namespaces(): array {
		$server     = rest_get_server();
		$namespaces = $server->get_namespaces();

		return array_values(
			array_filter(
				$namespaces,
				fn( $ns ) => ! in_array( $ns, array( 'oembed/1.0' ), true )
			)
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function get_content_types(): array {
		$post_types = get_post_types( array( 'show_in_rest' => true ), 'objects' );
		$result     = array();

		foreach ( $post_types as $type ) {
			$taxonomies = get_object_taxonomies( $type->name, 'names' );

			$result[ $type->name ] = array(
				'label'        => $type->label,
				'hierarchical' => $type->hierarchical,
				'has_archive'  => (bool) $type->has_archive,
				'taxonomies'   => array_values( $taxonomies ),
				'supports'     => get_all_post_type_supports( $type->name ),
			);
		}

		return $result;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function get_taxonomies(): array {
		$taxonomies = get_taxonomies( array( 'show_in_rest' => true ), 'objects' );
		$result     = array();

		foreach ( $taxonomies as $tax ) {
			$result[ $tax->name ] = array(
				'label'        => $tax->label,
				'hierarchical' => $tax->hierarchical,
				'object_types' => $tax->object_type,
			);
		}

		return $result;
	}

	/**
	 * @return array<array{slug: string, title: string}>
	 */
	private function get_block_categories(): array {
		$post       = get_post( 0 );
		$categories = get_block_categories( $post ?? new \WP_Post( (object) array() ) );

		return array_map(
			fn( $cat ) => array(
				'slug'  => $cat['slug'],
				'title' => $cat['title'],
			),
			$categories
		);
	}

	/**
	 * @return array<string, array<string>>
	 */
	private function get_writable_options(): array {
		$options = array(
			'wordpress' => array(
				'blogname',
				'blogdescription',
				'timezone_string',
				'date_format',
				'time_format',
				'start_of_week',
				'posts_per_page',
				'posts_per_rss',
				'show_on_front',
				'page_on_front',
				'page_for_posts',
				'blog_public',
				'default_comment_status',
				'default_ping_status',
				'comment_moderation',
				'users_can_register',
				'default_role',
			),
		);

		$plugin_options = $this->discover_all_plugin_options();
		return array_merge( $options, $plugin_options );
	}
}
