<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Templates;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\CacheableTrait;

class ListTemplates extends AbstractAbility {

	use CacheableTrait;

	private const CACHE_KEY = 'templates';
	private const CACHE_TTL = 300;

	public function get_category(): string {
		return 'wordforge-templates';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'List Templates', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'List site-level block structures: templates, template parts, navigation menus, reusable blocks. ' .
			'These are infrastructure elements (not content). ' .
			'USE: Discover IDs/slugs, then use get-blocks/update-blocks to read/edit block content. ' .
			'TYPES: wp_template=page layouts, wp_template_part=sections (header/footer), wp_navigation=nav menus, wp_block=reusable blocks.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_theme_options';
	}

	public function get_output_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'       => 'object',
					'properties' => array(
						'type'  => array( 'type' => 'string' ),
						'items' => array(
							'type'  => 'array',
							'items' => array(
								'type'       => 'object',
								'properties' => array(
									'id'          => array( 'type' => 'integer' ),
									'slug'        => array( 'type' => 'string' ),
									'title'       => array( 'type' => 'string' ),
									'description' => array(
										'type'        => 'string',
										'description' => 'Only for templates.',
									),
									'status'      => array( 'type' => 'string' ),
									'type'        => array( 'type' => 'string' ),
									'modified'    => array( 'type' => 'string' ),
									'source'      => array(
										'type'        => 'string',
										'description' => 'theme or custom. Only for templates.',
									),
									'area'        => array(
										'type'        => 'string',
										'description' => 'Only for wp_template_part.',
									),
									'sync_status' => array(
										'type'        => 'string',
										'description' => 'synced or unsynced. Only for wp_block.',
									),
								),
							),
						),
						'total' => array( 'type' => 'integer' ),
					),
				),
			),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'type' => array(
					'type'        => 'string',
					'description' => 'wp_template=page layouts, wp_template_part=sections, wp_navigation=nav menus, wp_block=reusable blocks.',
					'enum'        => array( 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_block' ),
					'default'     => 'wp_template',
				),
				'area' => array(
					'type'        => 'string',
					'description' => 'Filter template parts by area (header, footer, sidebar, etc.). Only applies to wp_template_part.',
				),
			),
		);
	}

	public function execute( array $args ): array {
		$type = $args['type'] ?? 'wp_template';
		$area = $args['area'] ?? null;

		$template_types = array( 'wp_template', 'wp_template_part' );
		if ( in_array( $type, $template_types, true ) && ! current_theme_supports( 'block-templates' ) ) {
			return $this->error( 'Current theme does not support block templates.', 'not_supported' );
		}

		return $this->cached_success(
			self::CACHE_KEY,
			fn() => $this->fetch_items( $type, $area ),
			self::CACHE_TTL,
			array(
				'type' => $type,
				'area' => $area,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fetch_items( string $type, ?string $area ): array {
		$template_types = array( 'wp_template', 'wp_template_part' );
		$is_template    = in_array( $type, $template_types, true );

		$post_status = $is_template
			? array( 'publish', 'auto-draft' )
			: array( 'publish', 'draft' );

		$posts = get_posts(
			array(
				'post_type'      => $type,
				'post_status'    => $post_status,
				'posts_per_page' => 100,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		$items = array();

		foreach ( $posts as $post ) {
			$item = array(
				'id'       => $post->ID,
				'slug'     => $post->post_name,
				'title'    => $post->post_title ?: $post->post_name,
				'status'   => $post->post_status,
				'type'     => $type,
				'modified' => $post->post_modified,
			);

			if ( $is_template ) {
				$item['description'] = $post->post_excerpt;
				$item['source']      = 'auto-draft' === $post->post_status ? 'theme' : 'custom';
			}

			if ( 'wp_template_part' === $type ) {
				$item_area    = get_post_meta( $post->ID, 'wp_template_part_area', true );
				$item['area'] = $item_area ?: 'uncategorized';
			}

			if ( 'wp_block' === $type ) {
				$item['sync_status'] = get_post_meta( $post->ID, 'wp_pattern_sync_status', true ) ?: 'synced';
			}

			if ( $area && isset( $item['area'] ) && $item['area'] !== $area ) {
				continue;
			}

			$items[] = $item;
		}

		return array(
			'type'  => $type,
			'items' => $items,
			'total' => count( $items ),
		);
	}
}
