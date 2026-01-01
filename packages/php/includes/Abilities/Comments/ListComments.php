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
		return __( 'List Comments', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve a list of WordPress comments with filtering by status, post, author, and search. Filter by moderation ' .
			'status (approved, pending, spam, trash), specific post, or search content. Supports pagination for large ' .
			'comment collections. Use this to review pending comments, find comments on specific posts, or audit comment ' .
			'activity. Returns up to 100 comments per page.',
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
					'status'       => array(
						'type'        => 'string',
						'description' => 'Filter by comment status.',
						'enum'        => array( 'approve', 'hold', 'spam', 'trash', 'all' ),
						'default'     => 'all',
					),
					'post_id'      => array(
						'type'        => 'integer',
						'description' => 'Filter by post ID.',
						'minimum'     => 1,
					),
					'author_email' => array(
						'type'        => 'string',
						'description' => 'Filter by commenter email.',
						'format'      => 'email',
					),
					'search'       => array(
						'type'        => 'string',
						'description' => 'Search term to filter comments by content, author name, or email.',
						'minLength'   => 1,
						'maxLength'   => 200,
					),
					'type'         => array(
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
			'type'         => $comment->comment_type ?: 'comment',
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
