<?php

declare(strict_types=1);

namespace WordForge\Abilities\Taxonomy;

use WordForge\Abilities\AbstractAbility;

class UpdateTerm extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-taxonomy';
	}

	public function get_title(): string {
		return __( 'Update Term', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Modify an existing taxonomy term (category, tag, or custom taxonomy). Supports partial updates - only provide fields ' .
			'to change. Can update name, slug, description, and parent (for hierarchical taxonomies). WARNING: Changing the slug ' .
			'changes the term\'s URLs, which may break external links. Use this to rename terms, reorganize hierarchies, or update ' .
			'descriptions for SEO.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'manage_categories';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'id', 'taxonomy' ],
			'properties' => [
				'id' => [
					'type'        => 'integer',
					'description' => 'Term ID.',
				],
				'taxonomy' => [
					'type'        => 'string',
					'description' => 'Taxonomy name.',
				],
				'name' => [
					'type'        => 'string',
					'description' => 'New term name.',
				],
				'slug' => [
					'type'        => 'string',
					'description' => 'New term slug.',
				],
				'description' => [
					'type'        => 'string',
					'description' => 'New term description.',
				],
				'parent' => [
					'type'        => 'integer',
					'description' => 'New parent term ID.',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$term_id = (int) $args['id'];
		$taxonomy = $args['taxonomy'];

		if ( ! taxonomy_exists( $taxonomy ) ) {
			return $this->error(
				sprintf( 'Taxonomy "%s" does not exist.', $taxonomy ),
				'invalid_taxonomy'
			);
		}

		$term = get_term( $term_id, $taxonomy );
		if ( ! $term || is_wp_error( $term ) ) {
			return $this->error( 'Term not found.', 'not_found' );
		}

		$update_args = [];

		if ( isset( $args['name'] ) ) {
			$update_args['name'] = sanitize_text_field( $args['name'] );
		}

		if ( isset( $args['slug'] ) ) {
			$update_args['slug'] = sanitize_title( $args['slug'] );
		}

		if ( isset( $args['description'] ) ) {
			$update_args['description'] = sanitize_textarea_field( $args['description'] );
		}

		if ( isset( $args['parent'] ) ) {
			$tax_obj = get_taxonomy( $taxonomy );
			if ( $tax_obj && $tax_obj->hierarchical ) {
				$update_args['parent'] = (int) $args['parent'];
			}
		}

		if ( empty( $update_args ) ) {
			return $this->error( 'No fields to update.', 'no_changes' );
		}

		$result = wp_update_term( $term_id, $taxonomy, $update_args );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'update_failed' );
		}

		$updated_term = get_term( $term_id, $taxonomy );

		return $this->success( [
			'id'          => $updated_term->term_id,
			'name'        => $updated_term->name,
			'slug'        => $updated_term->slug,
			'description' => $updated_term->description,
			'parent'      => $updated_term->parent,
			'taxonomy'    => $updated_term->taxonomy,
		], 'Term updated successfully.' );
	}
}
