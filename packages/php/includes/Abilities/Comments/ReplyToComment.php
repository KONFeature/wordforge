<?php
/**
 * Reply To Comment Ability - Create admin reply to a comment.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Comments;

use WordForge\Abilities\AbstractAbility;

class ReplyToComment extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-comments';
	}

	protected function is_read_only(): bool {
		return false;
	}

	public function get_title(): string {
		return __( 'Reply to Comment', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Create a reply to an existing WordPress comment as the current admin user. The reply is automatically ' .
			'approved and linked as a child of the parent comment. Use this to respond to user comments, answer ' .
			'questions, or engage in comment discussions on behalf of the site.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'moderate_comments';
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'parent_id', 'content' ),
			'properties' => array(
				'parent_id' => array(
					'type'        => 'integer',
					'description' => 'Parent comment ID to reply to.',
					'minimum'     => 1,
				),
				'content'   => array(
					'type'        => 'string',
					'description' => 'Reply content (supports HTML).',
					'minLength'   => 1,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$parent_id = absint( $args['parent_id'] );
		$parent    = get_comment( $parent_id );

		if ( ! $parent ) {
			return $this->error( 'Parent comment not found.', 'not_found' );
		}

		$current_user = wp_get_current_user();

		$comment_data = array(
			'comment_post_ID'      => $parent->comment_post_ID,
			'comment_content'      => wp_kses_post( $args['content'] ),
			'comment_parent'       => $parent_id,
			'comment_author'       => $current_user->display_name,
			'comment_author_email' => $current_user->user_email,
			'comment_author_url'   => $current_user->user_url,
			'user_id'              => $current_user->ID,
			'comment_approved'     => 1,
		);

		$comment_id = wp_insert_comment( $comment_data );

		if ( ! $comment_id ) {
			return $this->error( 'Failed to create reply.', 'insert_failed' );
		}

		$comment = get_comment( $comment_id );

		return $this->success(
			array(
				'id'         => $comment_id,
				'post_id'    => (int) $parent->comment_post_ID,
				'post_title' => get_the_title( $parent->comment_post_ID ),
				'parent_id'  => $parent_id,
				'content'    => $comment->comment_content,
				'author'     => $comment->comment_author,
				'date'       => $comment->comment_date,
			),
			'Reply posted successfully.'
		);
	}
}
