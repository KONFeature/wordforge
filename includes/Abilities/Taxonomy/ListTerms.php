<?php

declare(strict_types=1);

namespace WordForge\Abilities\Taxonomy;

use WordForge\Abilities\AbstractAbility;

class ListTerms extends AbstractAbility {

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

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'taxonomy' ],
			'properties' => [
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
				'per_page' => [
					'type'        => 'integer',
					'description' => 'Number of terms to return.',
					'default'     => 100,
					'minimum'     => 1,
					'maximum'     => 500,
				],
				'orderby' => [
					'type'        => 'string',
					'description' => 'Field to order by.',
					'enum'        => [ 'name', 'slug', 'term_id', 'count', 'parent' ],
					'default'     => 'name',
				],
				'order' => [
					'type'        => 'string',
					'description' => 'Order direction.',
					'enum'        => [ 'asc', 'desc' ],
					'default'     => 'asc',
				],
			],
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

		$query_args = [
			'taxonomy'   => $taxonomy,
			'hide_empty' => $args['hide_empty'] ?? false,
			'number'     => min( (int) ( $args['per_page'] ?? 100 ), 500 ),
			'orderby'    => $args['orderby'] ?? 'name',
			'order'      => strtoupper( $args['order'] ?? 'asc' ),
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
}
