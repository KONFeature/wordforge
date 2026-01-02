<?php
/**
 * Moderate Comment Ability - Approve, spam, trash, or reply to comments.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Comments;

use WordForge\Abilities\AbstractAbility;

class ModerateComment extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-comments';
	}

	protected function is_read_only(): bool {
		return false;
	}

	public function get_title(): string {
		return __( 'Moderate Comment', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Moderate WordPress comments: approve, spam, trash, restore, delete, or reply. Use "reply" action to post an ' .
			'admin response to a comment. Supports bulk operations for status changes (not replies). Replies are auto-approved ' .
			'and linked as child comments.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'moderate_comments';
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'action' ),
			'properties' => array(
				'id'      => array(
					'type'        => 'integer',
					'description' => 'Comment ID to moderate or reply to.',
					'minimum'     => 1,
				),
				'ids'     => array(
					'type'        => 'array',
					'items'       => array(
						'type'    => 'integer',
						'minimum' => 1,
					),
					'description' => 'Comment IDs for bulk moderation (not for replies).',
					'minItems'    => 1,
					'maxItems'    => 100,
				),
				'action'  => array(
					'type'        => 'string',
					'description' => 'Moderation action: status change or "reply" to respond.',
					'enum'        => array( 'approve', 'unapprove', 'spam', 'unspam', 'trash', 'untrash', 'delete', 'reply' ),
				),
				'content' => array(
					'type'        => 'string',
					'description' => 'Reply content (required when action is "reply"). Supports HTML.',
					'minLength'   => 1,
				),
			),
		);
	}

	protected function is_destructive(): bool {
		return true;
	}

	public function execute( array $args ): array {
		$action = $args['action'];

		if ( 'reply' === $action ) {
			return $this->handle_reply( $args );
		}

		$ids = ! empty( $args['ids'] ) ? array_map( 'absint', $args['ids'] ) : array( absint( $args['id'] ) );

		$results = array(
			'success' => array(),
			'failed'  => array(),
		);

		foreach ( $ids as $comment_id ) {
			$comment = get_comment( $comment_id );

			if ( ! $comment ) {
				$results['failed'][] = array(
					'id'     => $comment_id,
					'reason' => 'Comment not found',
				);
				continue;
			}

			$success = $this->perform_action( $comment_id, $action );

			if ( $success ) {
				$results['success'][] = $comment_id;
			} else {
				$results['failed'][] = array(
					'id'     => $comment_id,
					'reason' => 'Action failed',
				);
			}
		}

		$message = sprintf(
			'%d comment(s) %s successfully.',
			count( $results['success'] ),
			$this->get_action_past_tense( $action )
		);

		if ( ! empty( $results['failed'] ) ) {
			$message .= sprintf( ' %d failed.', count( $results['failed'] ) );
		}

		return $this->success( $results, $message );
	}

	private function handle_reply( array $args ): array {
		if ( empty( $args['id'] ) ) {
			return $this->error( 'Comment ID is required for replies.', 'missing_id' );
		}

		if ( empty( $args['content'] ) ) {
			return $this->error( 'Reply content is required.', 'missing_content' );
		}

		$parent_id = absint( $args['id'] );
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

	private function perform_action( int $comment_id, string $action ): bool {
		switch ( $action ) {
			case 'approve':
				return (bool) wp_set_comment_status( $comment_id, 'approve' );

			case 'unapprove':
				return (bool) wp_set_comment_status( $comment_id, 'hold' );

			case 'spam':
				return (bool) wp_spam_comment( $comment_id );

			case 'unspam':
				return (bool) wp_unspam_comment( $comment_id );

			case 'trash':
				return (bool) wp_trash_comment( $comment_id );

			case 'untrash':
				return (bool) wp_untrash_comment( $comment_id );

			case 'delete':
				return (bool) wp_delete_comment( $comment_id, true );

			default:
				return false;
		}
	}

	private function get_action_past_tense( string $action ): string {
		$map = array(
			'approve'   => 'approved',
			'unapprove' => 'unapproved',
			'spam'      => 'marked as spam',
			'unspam'    => 'removed from spam',
			'trash'     => 'trashed',
			'untrash'   => 'restored',
			'delete'    => 'permanently deleted',
			'reply'     => 'replied to',
		);
		return $map[ $action ] ?? $action;
	}
}
