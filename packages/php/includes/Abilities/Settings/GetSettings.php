<?php
/**
 * Get Settings Ability - Read WordPress site options.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Settings;

use WordForge\Abilities\AbstractAbility;

class GetSettings extends AbstractAbility {

	private const ALLOWED_OPTIONS = [
		'blogname',
		'blogdescription',
		'siteurl',
		'home',
		'admin_email',
		'users_can_register',
		'default_role',
		'timezone_string',
		'date_format',
		'time_format',
		'start_of_week',
		'WPLANG',
		'posts_per_page',
		'posts_per_rss',
		'rss_use_excerpt',
		'show_on_front',
		'page_on_front',
		'page_for_posts',
		'blog_public',
		'default_pingback_flag',
		'default_ping_status',
		'default_comment_status',
		'require_name_email',
		'comment_registration',
		'close_comments_for_old_posts',
		'close_comments_days_old',
		'thread_comments',
		'thread_comments_depth',
		'page_comments',
		'comments_per_page',
		'default_comments_page',
		'comment_order',
		'moderation_notify',
		'comments_notify',
		'comment_moderation',
		'comment_previously_approved',
		'show_avatars',
		'avatar_rating',
		'avatar_default',
		'permalink_structure',
		'category_base',
		'tag_base',
		'uploads_use_yearmonth_folders',
		'thumbnail_size_w',
		'thumbnail_size_h',
		'medium_size_w',
		'medium_size_h',
		'large_size_w',
		'large_size_h',
	];

	public function get_category(): string {
		return 'wordforge-settings';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Settings', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve WordPress site settings and options. Returns common site configuration values including site title, ' .
			'tagline, URL, timezone, date/time formats, reading settings, discussion settings, permalink structure, and media ' .
			'sizes. Use this to understand site configuration before making changes or to audit settings. Only safe, non-sensitive ' .
			'options are exposed.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'manage_options';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'options' => [
					'type'        => 'array',
					'items'       => [ 'type' => 'string' ],
					'description' => 'Specific option names to retrieve. If empty, returns all allowed options.',
				],
				'group'   => [
					'type'        => 'string',
					'description' => 'Get options by group for convenience.',
					'enum'        => [ 'general', 'reading', 'discussion', 'media', 'permalinks', 'all' ],
					'default'     => 'all',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$requested = $args['options'] ?? [];
		$group     = $args['group'] ?? 'all';

		if ( ! empty( $requested ) ) {
			$options_to_get = array_intersect( $requested, self::ALLOWED_OPTIONS );
		} else {
			$options_to_get = $this->get_options_by_group( $group );
		}

		$settings = [];
		foreach ( $options_to_get as $option ) {
			$settings[ $option ] = get_option( $option );
		}

		return $this->success( [
			'settings' => $settings,
			'groups'   => $this->categorize_options( $settings ),
		] );
	}

	private function get_options_by_group( string $group ): array {
		$groups = [
			'general'    => [
				'blogname', 'blogdescription', 'siteurl', 'home', 'admin_email',
				'users_can_register', 'default_role', 'timezone_string',
				'date_format', 'time_format', 'start_of_week', 'WPLANG',
			],
			'reading'    => [
				'posts_per_page', 'posts_per_rss', 'rss_use_excerpt',
				'show_on_front', 'page_on_front', 'page_for_posts', 'blog_public',
			],
			'discussion' => [
				'default_pingback_flag', 'default_ping_status', 'default_comment_status',
				'require_name_email', 'comment_registration', 'close_comments_for_old_posts',
				'close_comments_days_old', 'thread_comments', 'thread_comments_depth',
				'page_comments', 'comments_per_page', 'default_comments_page',
				'comment_order', 'moderation_notify', 'comments_notify',
				'comment_moderation', 'comment_previously_approved',
				'show_avatars', 'avatar_rating', 'avatar_default',
			],
			'media'      => [
				'uploads_use_yearmonth_folders', 'thumbnail_size_w', 'thumbnail_size_h',
				'medium_size_w', 'medium_size_h', 'large_size_w', 'large_size_h',
			],
			'permalinks' => [
				'permalink_structure', 'category_base', 'tag_base',
			],
		];

		if ( 'all' === $group ) {
			return self::ALLOWED_OPTIONS;
		}

		return $groups[ $group ] ?? [];
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, array<string, mixed>>
	 */
	private function categorize_options( array $settings ): array {
		$categorized = [
			'general'    => [],
			'reading'    => [],
			'discussion' => [],
			'media'      => [],
			'permalinks' => [],
		];

		foreach ( $settings as $key => $value ) {
			foreach ( $categorized as $group => &$group_settings ) {
				if ( in_array( $key, $this->get_options_by_group( $group ), true ) ) {
					$group_settings[ $key ] = $value;
					break;
				}
			}
		}

		return array_filter( $categorized );
	}
}
