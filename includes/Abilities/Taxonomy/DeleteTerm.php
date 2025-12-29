<?php

declare(strict_types=1);

namespace WordForge\Abilities\Taxonomy;

use WordForge\Abilities\AbstractAbility;

class DeleteTerm extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-taxonomy';
	}

	protected function is_destructive(): bool {
		return true;
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
		return [
			'type'       => 'object',
			'required'   => [ 'id', 'taxonomy' ],
			'properties' => [
				'id' => [
					'type'        => 'integer',
					'description' => 'Term ID to delete.',
				],
				'taxonomy' => [
					'type'        => 'string',
					'description' => 'Taxonomy name.',
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

		$deleted_info = [
			'id'       => $term->term_id,
			'name'     => $term->name,
			'slug'     => $term->slug,
			'taxonomy' => $term->taxonomy,
		];

		$result = wp_delete_term( $term_id, $taxonomy );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'delete_failed' );
		}

		if ( false === $result ) {
			return $this->error( 'Failed to delete term.', 'delete_failed' );
		}

		return $this->success( $deleted_info, 'Term deleted successfully.' );
	}
}
