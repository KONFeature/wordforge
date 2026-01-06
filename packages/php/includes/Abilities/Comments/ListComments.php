<?php
/**
 * List Comments Ability - List WordPress comments with filtering.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Comments;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListComments extends AbstractAbility {

	use PaginationSchemaTrait;

	public function get_category(): string {
		return 'wordforge-comments';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Comments', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Get a single comment by ID (with optional replies) or list comments with filtering. ' .
			'USE: Review pending comments, view comment threads, moderation queue. ' .
			'NOT FOR: Replying/moderating (use moderate-comment).',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'moderate_comments';
	}

	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			$this->get_comment_item_schema(),
			'Array of comments matching the query filters.'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
					'id'              => array(
						'type'        => 'integer',
						'description' => 'Comment ID. When provided, returns full details for that single comment. Omit to list comments.',
						'minimum'     => 1,
					),
					'include_replies' => array(
						'type'        => 'boolean',
						'description' => 'When fetching single comment by ID, include child replies.',
						'default'     => false,
					),
					'status'          => array(
						'type'        => 'string',
						'description' => 'approve=published, hold=pending moderation, spam/trash=filtered.',
						'enum'        => array( 'approve', 'hold', 'spam', 'trash', 'all' ),
						'default'     => 'all',
					),
					'post_id'         => array(
						'type'        => 'integer',
						'description' => 'Filter by post ID.',
					),
					'author_email'    => array(
						'type'        => 'string',
						'description' => 'Filter by commenter email.',
						'format'      => 'email',
					),
					'search'          => array(
						'type'        => 'string',
						'description' => 'Search term to filter comments by content, author name, or email.',
						'minLength'   => 1,
						'maxLength'   => 200,
					),
					'type'            => array(
						'type'        => 'string',
						'description' => 'Filter by comment type (comment, pingback, trackback).',
						'enum'        => array( 'comment', 'pingback', 'trackback', 'all' ),
						'default'     => 'all',
					),
				),
				$this->get_pagination_input_schema(
					array( 'date', 'date_gmt', 'id' )
				)
			),
		);
	}

	public function execute( array $args ): array {
		if ( ! empty( $args['id'] ) ) {
			return $this->get_single_comment( absint( $args['id'] ), ! empty( $args['include_replies'] ) );
		}

		return $this->list_comments( $args );
	}

	protected function get_single_comment( int $comment_id, bool $include_replies ): array {
		$comment = get_comment( $comment_id );

		if ( ! $comment ) {
			return $this->error( 'Comment not found.', 'not_found' );
		}

		$data = $this->format_comment( $comment );

		if ( $include_replies ) {
			$replies         = get_comments(
				array(
					'parent'  => $comment->comment_ID,
					'orderby' => 'comment_date',
					'order'   => 'ASC',
				)
			);
			$data['replies'] = array_map( array( $this, 'format_comment' ), $replies );
		}

		return $this->paginated_success(
			array( $data ),
			1,
			1,
			array(
				'page'     => 1,
				'per_page' => 1,
			)
		);
	}

	protected function list_comments( array $args ): array {
		$pagination = $this->normalize_pagination_args( $args, 100, 20, 'date', 'desc' );

		$query_args = array(
			'number'  => $pagination['per_page'],
			'offset'  => ( $pagination['page'] - 1 ) * $pagination['per_page'],
			'orderby' => $this->map_orderby( $pagination['orderby'] ),
			'order'   => $pagination['order'],
		);

		if ( ! empty( $args['status'] ) && 'all' !== $args['status'] ) {
			$query_args['status'] = $args['status'];
		}

		if ( ! empty( $args['post_id'] ) ) {
			$query_args['post_id'] = absint( $args['post_id'] );
		}

		if ( ! empty( $args['author_email'] ) ) {
			$query_args['author_email'] = sanitize_email( $args['author_email'] );
		}

		if ( ! empty( $args['search'] ) ) {
			$query_args['search'] = sanitize_text_field( $args['search'] );
		}

		if ( ! empty( $args['type'] ) && 'all' !== $args['type'] ) {
			$query_args['type'] = $args['type'];
		}

		$comments = get_comments( $query_args );

		$count_args = $query_args;
		unset( $count_args['number'], $count_args['offset'] );
		$count_args['count'] = true;
		$total               = (int) get_comments( $count_args );

		$items       = array_map( array( $this, 'format_comment' ), $comments );
		$total_pages = (int) ceil( $total / $pagination['per_page'] );

		return $this->paginated_success( $items, $total, $total_pages, $pagination );
	}

	private function map_orderby( string $orderby ): string {
		$map = array(
			'date'     => 'comment_date',
			'date_gmt' => 'comment_date_gmt',
			'id'       => 'comment_ID',
		);
		return $map[ $orderby ] ?? 'comment_date';
	}

	/**
	 * @param \WP_Comment $comment
	 * @return array<string, mixed>
	 */
	private function format_comment( \WP_Comment $comment ): array {
		return array(
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
			'type'         => ! empty( $comment->comment_type ) ? $comment->comment_type : 'comment',
			'parent'       => (int) $comment->comment_parent,
			'user_id'      => (int) $comment->user_id,
			'avatar_url'   => get_avatar_url( $comment->comment_author_email, array( 'size' => 48 ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_comment_item_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'           => array(
					'type'        => 'integer',
					'description' => 'Unique comment ID',
				),
				'post_id'      => array(
					'type'        => 'integer',
					'description' => 'Parent post ID',
				),
				'post_title'   => array(
					'type'        => 'string',
					'description' => 'Parent post title',
				),
				'author'       => array(
					'type'        => 'string',
					'description' => 'Comment author name',
				),
				'author_email' => array(
					'type'        => 'string',
					'description' => 'Author email',
				),
				'author_url'   => array(
					'type'        => 'string',
					'description' => 'Author website',
				),
				'date'         => array(
					'type'        => 'string',
					'description' => 'Comment date',
				),
				'content'      => array(
					'type'        => 'string',
					'description' => 'Comment content',
				),
				'status'       => array(
					'type'        => 'string',
					'description' => 'Moderation status',
				),
				'type'         => array(
					'type'        => 'string',
					'description' => 'Comment type',
				),
				'parent'       => array(
					'type'        => 'integer',
					'description' => 'Parent comment ID',
				),
				'user_id'      => array(
					'type'        => 'integer',
					'description' => 'Registered user ID if logged in',
				),
				'avatar_url'   => array(
					'type'        => 'string',
					'description' => 'Author avatar URL',
				),
			),
		);
	}
}
