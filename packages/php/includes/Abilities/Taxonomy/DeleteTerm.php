<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Taxonomy;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\DeletePatternTrait;

class DeleteTerm extends AbstractAbility {

	use DeletePatternTrait;

	public function get_category(): string {
		return 'wordforge-taxonomy';
	}

	public function get_title(): string {
		return __( 'Delete Term', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Permanently delete a taxonomy term (category, tag, or custom taxonomy). This action removes the term from the database ' .
			'and from all posts/products using it. Posts will simply have this term removed (not deleted). If deleting a hierarchical ' .
			'term with children, child terms become top-level. Cannot be undone. Use with caution - consider reassigning posts to ' .
			'another term first if needed.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'manage_categories';
	}

	public function get_input_schema(): array {
		$schema                           = $this->get_delete_input_schema( false, 'term' );
		$schema['required']               = array( 'id', 'taxonomy' );
		$schema['properties']['taxonomy'] = array(
			'type'        => 'string',
			'description' => 'Taxonomy name.',
		);
		return $schema;
	}

	public function get_output_schema(): array {
		return $this->get_delete_output_schema(
			array(
				'name'     => array( 'type' => 'string' ),
				'slug'     => array( 'type' => 'string' ),
				'taxonomy' => array( 'type' => 'string' ),
			),
			false
		);
	}

	public function execute( array $args ): array {
		$term_id  = (int) $args['id'];
		$taxonomy = $args['taxonomy'];

		if ( ! taxonomy_exists( $taxonomy ) ) {
			return $this->error(
				sprintf( 'Taxonomy "%s" does not exist.', $taxonomy ),
				'invalid_taxonomy'
			);
		}

		$term = get_term( $term_id, $taxonomy );
		if ( ! $term || is_wp_error( $term ) ) {
			return $this->delete_not_found( 'Term' );
		}

		$deleted_info = array(
			'name'     => $term->name,
			'slug'     => $term->slug,
			'taxonomy' => $term->taxonomy,
		);

		$result = wp_delete_term( $term_id, $taxonomy );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'delete_failed' );
		}

		if ( false === $result ) {
			return $this->delete_failed( 'term' );
		}

		return $this->success(
			array_merge(
				array(
					'id'      => $term_id,
					'deleted' => true,
				),
				$deleted_info
			),
			'Term deleted successfully.'
		);
	}
}
