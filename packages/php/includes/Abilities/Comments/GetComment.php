<?php
/**
 * Get Comment Ability - Get a single WordPress comment.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Comments;

use WordForge\Abilities\AbstractAbility;

class GetComment extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-comments';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Comment', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve detailed information about a specific WordPress comment by ID. Returns the full comment content, ' .
			'author information, moderation status, and associated post details. Optionally include child replies. ' .
			'Use this to view comment details before moderation or to inspect comment threads.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'moderate_comments';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'id' ],
			'properties' => [
				'id'              => [
					'type'        => 'integer',
					'description' => 'Comment ID to retrieve.',
					'minimum'     => 1,
				],
				'include_replies' => [
					'type'        => 'boolean',
					'description' => 'Include child replies to this comment.',
					'default'     => false,
				],
			],
		];
	}

	public function execute( array $args ): array {
		$comment = get_comment( absint( $args['id'] ) );

		if ( ! $comment ) {
			return $this->error( 'Comment not found.', 'not_found' );
		}

		$data = $this->format_comment( $comment );

		if ( ! empty( $args['include_replies'] ) ) {
			$replies = get_comments( [
				'parent'  => $comment->comment_ID,
				'orderby' => 'comment_date',
				'order'   => 'ASC',
			] );
			$data['replies'] = array_map( [ $this, 'format_comment' ], $replies );
		}

		return $this->success( $data );
	}

	/**
	 * @param \WP_Comment $comment
	 * @return array<string, mixed>
	 */
	private function format_comment( \WP_Comment $comment ): array {
		return [
			'id'           => (int) $comment->comment_ID,
			'post_id'      => (int) $comment->comment_post_ID,
			'post_title'   => get_the_title( $comment->comment_post_ID ),
			'author'       => $comment->comment_author,
			'author_email' => $comment->comment_author_email,
			'author_url'   => $comment->comment_author_url,
			'author_ip'    => $comment->comment_author_IP,
			'date'         => $comment->comment_date,
			'date_gmt'     => $comment->comment_date_gmt,
			'content'      => $comment->comment_content,
			'status'       => wp_get_comment_status( $comment ),
			'type'         => $comment->comment_type ?: 'comment',
			'parent'       => (int) $comment->comment_parent,
			'user_id'      => (int) $comment->user_id,
			'avatar_url'   => get_avatar_url( $comment->comment_author_email, [ 'size' => 48 ] ),
		];
	}
}
