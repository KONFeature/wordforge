<?php

declare(strict_types=1);

namespace WordForge\Abilities\Taxonomy;

use WordForge\Abilities\AbstractAbility;

class SaveTerm extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-taxonomy';
	}

	public function get_title(): string {
		return __( 'Save Term', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Create or update taxonomy terms (categories, tags, product categories, custom taxonomies). Omit "id" to create ' .
			'new; provide "id" to update existing. Supports name, slug, description, and parent for hierarchical taxonomies.',
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
						'id'          => array( 'type' => 'integer' ),
						'created'     => array( 'type' => 'boolean' ),
						'name'        => array( 'type' => 'string' ),
						'slug'        => array( 'type' => 'string' ),
						'description' => array( 'type' => 'string' ),
						'parent'      => array( 'type' => 'integer' ),
						'taxonomy'    => array( 'type' => 'string' ),
					),
				),
				'message' => array( 'type' => 'string' ),
			),
			'required'   => array( 'success', 'data' ),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'taxonomy', 'name' ),
			'properties' => array(
				'id'          => array(
					'type'        => 'integer',
					'description' => 'Term ID to update. Omit to create new.',
					'minimum'     => 1,
				),
				'taxonomy'    => array(
					'type'        => 'string',
					'description' => '"category", "post_tag", "product_cat", or custom.',
				),
				'name'        => array(
					'type' => 'string',
				),
				'slug'        => array(
					'type'        => 'string',
					'description' => 'URL slug. Auto-generated if omitted.',
				),
				'description' => array(
					'type'        => 'string',
					'description' => 'Term description shown on archives.',
				),
				'parent'      => array(
					'type'        => 'integer',
					'description' => 'Parent term ID. Only for hierarchical taxonomies.',
					'minimum'     => 0,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$taxonomy  = $args['taxonomy'];
		$id        = $args['id'] ?? null;
		$is_update = (bool) $id;

		if ( ! taxonomy_exists( $taxonomy ) ) {
			return $this->error( sprintf( 'Taxonomy "%s" does not exist.', $taxonomy ), 'invalid_taxonomy' );
		}

		if ( $is_update ) {
			$term = get_term( (int) $id, $taxonomy );
			if ( ! $term || is_wp_error( $term ) ) {
				return $this->error( "Term #{$id} not found. Omit 'id' to create new.", 'not_found' );
			}
		}

		$term_args = array();

		if ( isset( $args['slug'] ) ) {
			$term_args['slug'] = sanitize_title( $args['slug'] );
		}

		if ( isset( $args['description'] ) ) {
			$term_args['description'] = sanitize_textarea_field( $args['description'] );
		}

		if ( isset( $args['parent'] ) ) {
			$tax_obj = get_taxonomy( $taxonomy );
			if ( $tax_obj && $tax_obj->hierarchical ) {
				$term_args['parent'] = (int) $args['parent'];
			}
		}

		if ( $is_update ) {
			if ( isset( $args['name'] ) ) {
				$term_args['name'] = sanitize_text_field( $args['name'] );
			}

			if ( empty( $term_args ) ) {
				return $this->error( 'No fields to update.', 'no_changes' );
			}

			$result = wp_update_term( (int) $id, $taxonomy, $term_args );
		} else {
			$result = wp_insert_term( sanitize_text_field( $args['name'] ), $taxonomy, $term_args );
		}

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), $is_update ? 'update_failed' : 'create_failed' );
		}

		$term_id    = $is_update ? (int) $id : $result['term_id'];
		$saved_term = get_term( $term_id, $taxonomy );

		return $this->success(
			array(
				'id'          => $saved_term->term_id,
				'created'     => ! $is_update,
				'name'        => $saved_term->name,
				'slug'        => $saved_term->slug,
				'description' => $saved_term->description,
				'parent'      => $saved_term->parent,
				'taxonomy'    => $saved_term->taxonomy,
			),
			$is_update ? 'Term updated successfully.' : 'Term created successfully.'
		);
	}
}
