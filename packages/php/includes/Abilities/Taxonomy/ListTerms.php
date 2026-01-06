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
			'List taxonomy terms (categories, tags, product_cat, or custom). Filter by parent, search, hide empty. ' .
			'USE: Browse terms, find term IDs/slugs for content filtering. ' .
			'NOT FOR: Creating terms (use save-term), assigning to content (use save-content).',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'manage_categories';
	}

	public function get_output_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'       => 'object',
					'properties' => array(
						'taxonomy' => array( 'type' => 'string' ),
						'items'    => array(
							'type'  => 'array',
							'items' => $this->get_term_item_schema(),
						),
						'total'    => array( 'type' => 'integer' ),
					),
				),
			),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'taxonomy' ),
			'properties' => array_merge(
				array(
					'taxonomy'   => array(
						'type'        => 'string',
						'description' => 'Taxonomy name (category, post_tag, product_cat, or custom taxonomy).',
					),
					'search'     => array(
						'type'        => 'string',
						'description' => 'Search term name.',
					),
					'parent'     => array(
						'type'        => 'integer',
						'description' => 'Parent term ID (0 for top-level only).',
					),
					'hide_empty' => array(
						'type'        => 'boolean',
						'description' => 'Hide terms with no posts.',
						'default'     => false,
					),
				),
				$this->get_pagination_input_schema(
					array( 'name', 'slug', 'term_id', 'count', 'parent' ),
					500,
					100,
				)
			),
		);
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

		$query_args = array(
			'taxonomy'   => $taxonomy,
			'hide_empty' => $args['hide_empty'] ?? false,
			'number'     => $pagination['per_page'],
			'orderby'    => $pagination['orderby'],
			'order'      => $pagination['order'],
		);

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

		// array_values() ensures sequential keys for proper JSON array encoding
		$items = array_values( array_map( fn( \WP_Term $term ) => $this->format_term( $term ), $terms ) );

		return $this->success(
			array(
				'taxonomy' => $taxonomy,
				'items'    => $items,
				'total'    => count( $items ),
			)
		);
	}

	protected function format_term( \WP_Term $term ): array {
		return array(
			'id'          => $term->term_id,
			'name'        => $term->name,
			'slug'        => $term->slug,
			'description' => $term->description,
			'parent'      => $term->parent,
			'count'       => $term->count,
			'taxonomy'    => $term->taxonomy,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_term_item_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'          => array( 'type' => 'integer' ),
				'name'        => array( 'type' => 'string' ),
				'slug'        => array( 'type' => 'string' ),
				'description' => array( 'type' => 'string' ),
				'parent'      => array( 'type' => 'integer' ),
				'count'       => array( 'type' => 'integer' ),
				'taxonomy'    => array( 'type' => 'string' ),
			),
		);
	}
}
