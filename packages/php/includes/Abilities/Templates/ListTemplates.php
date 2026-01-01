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
			'List block templates and template parts for Full Site Editing (FSE) themes. Templates define page layouts (index, single, archive, etc.). ' .
			'Template parts are reusable sections (header, footer, sidebar). Shows both theme-provided and custom user templates. Filter template ' .
			'parts by area (header/footer/sidebar). Use this to discover available templates or template parts before editing. Requires FSE theme support.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_theme_options';
	}

	public function get_output_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'       => 'object',
					'properties' => [
						'type'  => [ 'type' => 'string' ],
						'items' => [
							'type'  => 'array',
							'items' => [
								'type'       => 'object',
								'properties' => [
									'id'          => [ 'type' => 'integer' ],
									'slug'        => [ 'type' => 'string' ],
									'title'       => [ 'type' => 'string' ],
									'description' => [ 'type' => 'string' ],
									'status'      => [ 'type' => 'string' ],
									'type'        => [ 'type' => 'string' ],
									'modified'    => [ 'type' => 'string' ],
									'source'      => [ 'type' => 'string' ],
									'area'        => [ 'type' => 'string' ],
								],
							],
						],
						'total' => [ 'type' => 'integer' ],
					],
					'required' => [ 'type', 'items', 'total' ],
				],
			],
			'required' => [ 'success', 'data' ],
		];
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'type' => [
					'type'    => 'string',
					'enum'    => [ 'wp_template', 'wp_template_part' ],
					'default' => 'wp_template',
				],
				'area' => [
					'type'        => 'string',
					'description' => 'Filter template parts by area (header, footer, sidebar, etc.).',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$type = $args['type'] ?? 'wp_template';
		$area = $args['area'] ?? null;

		if ( ! current_theme_supports( 'block-templates' ) ) {
			return $this->error( 'Current theme does not support block templates.', 'not_supported' );
		}

		return $this->cached_success(
			self::CACHE_KEY,
			fn() => $this->fetch_templates( $type, $area ),
			self::CACHE_TTL,
			[ 'type' => $type, 'area' => $area ]
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fetch_templates( string $type, ?string $area ): array {
		$templates = get_posts( [
			'post_type'      => $type,
			'post_status'    => [ 'publish', 'auto-draft' ],
			'posts_per_page' => 100,
			'orderby'        => 'title',
			'order'          => 'ASC',
		] );

		$items = [];

		foreach ( $templates as $template ) {
			$item = [
				'id'          => $template->ID,
				'slug'        => $template->post_name,
				'title'       => $template->post_title ?: $template->post_name,
				'description' => $template->post_excerpt,
				'status'      => $template->post_status,
				'type'        => $type,
				'modified'    => $template->post_modified,
				'source'      => 'auto-draft' === $template->post_status ? 'theme' : 'custom',
			];

			if ( 'wp_template_part' === $type ) {
				$item_area = get_post_meta( $template->ID, 'wp_template_part_area', true );
				$item['area'] = $item_area ?: 'uncategorized';
			}

			if ( $area && isset( $item['area'] ) && $item['area'] !== $area ) {
				continue;
			}

			$items[] = $item;
		}

		return [
			'type'  => $type,
			'items' => $items,
			'total' => count( $items ),
		];
	}
}
