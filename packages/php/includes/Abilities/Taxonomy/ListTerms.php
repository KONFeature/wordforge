<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Taxonomy;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListTerms extends AbstractAbility {

	use PaginationSchemaTrait;

	public function get_category(): string {
		return 'wordforge-taxonomy';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'List Terms', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve a list of taxonomy terms (categories, tags, product categories, or custom taxonomies) with powerful filtering. ' .
			'Filter by parent term, search by name, hide/show empty terms, and control sorting. Returns up to 500 terms. ' .
			'Use this to browse available terms, find specific categories/tags, or build navigation menus from taxonomy hierarchies. ' .
			'Each term includes post count, parent info, and full details.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'manage_categories';
	}

	public function get_output_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'       => 'object',
					'properties' => [
						'taxonomy' => [ 'type' => 'string' ],
						'items'    => [
							'type'  => 'array',
							'items' => $this->get_term_item_schema(),
						],
						'total' => [ 'type' => 'integer' ],
					],
					'required' => [ 'taxonomy', 'items', 'total' ],
				],
			],
			'required' => [ 'success', 'data' ],
		];
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'taxonomy' ],
			'properties' => array_merge(
				[
					'taxonomy' => [
						'type'        => 'string',
						'description' => 'Taxonomy name (category, post_tag, product_cat, or custom taxonomy).',
					],
					'search' => [
						'type'        => 'string',
						'description' => 'Search term name.',
					],
					'parent' => [
						'type'        => 'integer',
						'description' => 'Parent term ID (0 for top-level only).',
					],
					'hide_empty' => [
						'type'        => 'boolean',
						'description' => 'Hide terms with no posts.',
						'default'     => false,
					],
				],
				$this->get_pagination_input_schema(
					[ 'name', 'slug', 'term_id', 'count', 'parent' ],
					500,
					100,
				)
			),
		];
	}

	public function execute( array $args ): array {
		$taxonomy = $args['taxonomy'];

		if ( ! taxonomy_exists( $taxonomy ) ) {
			return $this->error(
				sprintf( 'Taxonomy "%s" does not exist.', $taxonomy ),
				'invalid_taxonomy'
			);
		}

		$pagination = $this->normalize_pagination_args( $args, 500, 100, 'name', 'asc' );

		$query_args = [
			'taxonomy'   => $taxonomy,
			'hide_empty' => $args['hide_empty'] ?? false,
			'number'     => $pagination['per_page'],
			'orderby'    => $pagination['orderby'],
			'order'      => $pagination['order'],
		];

		if ( ! empty( $args['search'] ) ) {
			$query_args['search'] = sanitize_text_field( $args['search'] );
		}

		if ( isset( $args['parent'] ) ) {
			$query_args['parent'] = (int) $args['parent'];
		}

		$terms = get_terms( $query_args );

		if ( is_wp_error( $terms ) ) {
			return $this->error( $terms->get_error_message(), 'query_failed' );
		}

		$items = array_map( fn( \WP_Term $term ) => $this->format_term( $term ), $terms );

		return $this->success( [
			'taxonomy' => $taxonomy,
			'items'    => $items,
			'total'    => count( $items ),
		] );
	}

	protected function format_term( \WP_Term $term ): array {
		return [
			'id'          => $term->term_id,
			'name'        => $term->name,
			'slug'        => $term->slug,
			'description' => $term->description,
			'parent'      => $term->parent,
			'count'       => $term->count,
			'taxonomy'    => $term->taxonomy,
		];
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_term_item_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'id'          => [ 'type' => 'integer' ],
				'name'        => [ 'type' => 'string' ],
				'slug'        => [ 'type' => 'string' ],
				'description' => [ 'type' => 'string' ],
				'parent'      => [ 'type' => 'integer' ],
				'count'       => [ 'type' => 'integer' ],
				'taxonomy'    => [ 'type' => 'string' ],
			],
		];
	}
}
