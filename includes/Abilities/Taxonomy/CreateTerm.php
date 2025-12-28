<?php

declare(strict_types=1);

namespace WordForge\Abilities\Taxonomy;

use WordForge\Abilities\AbstractAbility;

class CreateTerm extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-taxonomy';
	}

	public function get_title(): string {
		return __( 'Create Term', 'wordforge' );
	}

	public function get_description(): string {
		return __( 'Create a new taxonomy term (category, tag, or custom taxonomy term).', 'wordforge' );
	}

	public function get_capability(): string {
		return 'manage_categories';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'taxonomy', 'name' ],
			'properties' => [
				'taxonomy' => [
					'type'        => 'string',
					'description' => 'Taxonomy name (category, post_tag, product_cat, or custom taxonomy).',
				],
				'name' => [
					'type'        => 'string',
					'description' => 'Term name.',
				],
				'slug' => [
					'type'        => 'string',
					'description' => 'Term slug (auto-generated from name if not provided).',
				],
				'description' => [
					'type'        => 'string',
					'description' => 'Term description.',
				],
				'parent' => [
					'type'        => 'integer',
					'description' => 'Parent term ID for hierarchical taxonomies.',
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

		$term_args = [];

		if ( ! empty( $args['slug'] ) ) {
			$term_args['slug'] = sanitize_title( $args['slug'] );
		}

		if ( ! empty( $args['description'] ) ) {
			$term_args['description'] = sanitize_textarea_field( $args['description'] );
		}

		if ( isset( $args['parent'] ) ) {
			$tax_obj = get_taxonomy( $taxonomy );
			if ( $tax_obj && $tax_obj->hierarchical ) {
				$term_args['parent'] = (int) $args['parent'];
			}
		}

		$result = wp_insert_term(
			sanitize_text_field( $args['name'] ),
			$taxonomy,
			$term_args
		);

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'create_failed' );
		}

		$term = get_term( $result['term_id'], $taxonomy );

		return $this->success( [
			'id'          => $term->term_id,
			'name'        => $term->name,
			'slug'        => $term->slug,
			'description' => $term->description,
			'parent'      => $term->parent,
			'taxonomy'    => $term->taxonomy,
		], 'Term created successfully.' );
	}
}
