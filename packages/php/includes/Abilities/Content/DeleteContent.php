<?php
/**
 * Delete Content Ability - Delete a post, page, or custom post type.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\DeletePatternTrait;

class DeleteContent extends AbstractAbility {

	use DeletePatternTrait;

	public function get_category(): string {
		return 'wordforge-content';
	}

	public function get_title(): string {
		return __( 'Delete Content', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Delete WordPress content (post, page, or custom post type). By default, content is moved to trash (soft delete) ' .
			'where it can be restored later. Use force=true for permanent deletion (cannot be undone). Permanently deleting ' .
			'content also removes all associated metadata, comments, and revisions. Use with caution, especially with force=true. ' .
			'This is a destructive operation that requires delete_posts capability.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'delete_posts';
	}

	public function get_input_schema(): array {
		return $this->get_delete_input_schema( true, 'content' );
	}

	public function get_output_schema(): array {
		return $this->get_delete_output_schema();
	}

	public function execute( array $args ): array {
		$post_id = (int) $args['id'];
		$force = $this->is_force_delete( $args );

		$post = get_post( $post_id );

		if ( ! $post ) {
			return $this->delete_not_found( 'Content' );
		}

		if ( ! current_user_can( 'delete_post', $post_id ) ) {
			return $this->delete_forbidden( 'this content' );
		}

		$title = $post->post_title;
		$type = $post->post_type;

		$result = wp_delete_post( $post_id, $force );

		if ( ! $result ) {
			return $this->delete_failed( 'content' );
		}

		return $this->delete_success( $post_id, $type, $title, $force );
	}
}
