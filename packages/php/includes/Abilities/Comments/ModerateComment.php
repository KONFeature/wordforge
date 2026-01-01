<?php
/**
 * Moderate Comment Ability - Approve, spam, or trash comments.
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
			'Moderate a WordPress comment by changing its status. Approve pending comments to make them visible, mark as ' .
			'spam to move to spam queue, trash to soft-delete, or untrash/unspam to restore. Supports bulk operations on ' .
			'multiple comments. Use this to manage comment moderation workflow and keep discussions clean.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'moderate_comments';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'action' ],
			'oneOf'      => [
				[ 'required' => [ 'id' ] ],
				[ 'required' => [ 'ids' ] ],
			],
			'properties' => [
				'id'     => [
					'type'        => 'integer',
					'description' => 'Single comment ID to moderate.',
					'minimum'     => 1,
				],
				'ids'    => [
					'type'        => 'array',
					'items'       => [ 'type' => 'integer', 'minimum' => 1 ],
					'description' => 'Array of comment IDs for bulk moderation.',
					'minItems'    => 1,
					'maxItems'    => 100,
				],
				'action' => [
					'type'        => 'string',
					'description' => 'Moderation action to perform.',
					'enum'        => [ 'approve', 'unapprove', 'spam', 'unspam', 'trash', 'untrash', 'delete' ],
				],
			],
		];
	}

	protected function is_destructive(): bool {
		return true;
	}

	public function execute( array $args ): array {
		$action = $args['action'];
		$ids    = ! empty( $args['ids'] ) ? array_map( 'absint', $args['ids'] ) : [ absint( $args['id'] ) ];

		$results = [
			'success' => [],
			'failed'  => [],
		];

		foreach ( $ids as $comment_id ) {
			$comment = get_comment( $comment_id );

			if ( ! $comment ) {
				$results['failed'][] = [
					'id'     => $comment_id,
					'reason' => 'Comment not found',
				];
				continue;
			}

			$success = $this->perform_action( $comment_id, $action );

			if ( $success ) {
				$results['success'][] = $comment_id;
			} else {
				$results['failed'][] = [
					'id'     => $comment_id,
					'reason' => 'Action failed',
				];
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
		$map = [
			'approve'   => 'approved',
			'unapprove' => 'unapproved',
			'spam'      => 'marked as spam',
			'unspam'    => 'removed from spam',
			'trash'     => 'trashed',
			'untrash'   => 'restored',
			'delete'    => 'permanently deleted',
		];
		return $map[ $action ] ?? $action;
	}
}
