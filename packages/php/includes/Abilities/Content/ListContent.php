<?php
/**
 * List Content Ability - List posts, pages, or custom post types.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\CacheableTrait;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListContent extends AbstractAbility {

	use CacheableTrait;
	use PaginationSchemaTrait;

	public function get_category(): string {
		return 'wordforge-content';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'List Content', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve a list of WordPress content items (posts, pages, or custom post types) with powerful filtering, ' .
			'searching, and sorting capabilities. Supports pagination for large result sets. Use this to browse content, ' .
			'find specific items by search terms, filter by author/category/tag/status, or get recently modified content. ' .
			'Returns up to 100 items per page with pagination metadata for navigating through larger collections.',
			'wordforge'
		);
	}

	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			$this->get_content_item_schema(),
			'Array of content items matching the query filters. Empty array if no matches found.'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
					'post_type' => array(
						'type'        => 'string',
						'description' => 'Content type to list: "post" for blog posts, "page" for pages, or any registered custom post type slug.',
						'default'     => 'post',
					),
					'status'    => array(
						'type'        => 'string',
						'description' => 'Filter by publication status.',
						'enum'        => array( 'publish', 'draft', 'pending', 'private', 'trash', 'any' ),
						'default'     => 'any',
					),
					'search'    => array(
						'type'        => 'string',
						'description' => 'Search term to filter content by title, content, or excerpt.',
						'minLength'   => 1,
						'maxLength'   => 200,
					),
					'author'    => array(
						'type'        => 'integer',
						'description' => 'Filter by author user ID.',
						'minimum'     => 1,
					),
					'category'  => array(
						'type'        => 'string',
						'description' => 'Filter posts by category slug.',
						'pattern'     => '^[a-z0-9-]+$',
					),
					'tag'       => array(
						'type'        => 'string',
						'description' => 'Filter posts by tag slug.',
						'pattern'     => '^[a-z0-9-]+$',
					),
				),
				$this->get_pagination_input_schema(
					array( 'date', 'title', 'modified', 'menu_order', 'id' )
				)
			),
		);
	}

	public function execute( array $args ): array {
		$post_type = $args['post_type'] ?? 'post';

		if ( ! post_type_exists( $post_type ) ) {
			return $this->error(
				sprintf( 'Post type "%s" does not exist.', $post_type ),
				'invalid_post_type'
			);
		}

		$pagination = $this->normalize_pagination_args( $args );
		$cache_args = array_merge( $args, $pagination );

		return $this->cached_success(
			'list_content',
			fn() => $this->fetch_content( $args, $pagination ),
			120,
			$cache_args
		);
	}

	/**
	 * @param array<string, mixed> $args       Input arguments.
	 * @param array<string, mixed> $pagination Normalized pagination args.
	 * @return array<string, mixed>
	 */
	private function fetch_content( array $args, array $pagination ): array {
		$post_type = $args['post_type'] ?? 'post';

		$query_args = array(
			'post_type'      => $post_type,
			'post_status'    => $args['status'] ?? 'any',
			'posts_per_page' => $pagination['per_page'],
			'paged'          => $pagination['page'],
			'orderby'        => $pagination['orderby'],
			'order'          => $pagination['order'],
		);

		if ( ! empty( $args['search'] ) ) {
			$query_args['s'] = sanitize_text_field( $args['search'] );
		}

		if ( ! empty( $args['author'] ) ) {
			$query_args['author'] = (int) $args['author'];
		}

		if ( ! empty( $args['category'] ) && 'post' === $post_type ) {
			$query_args['category_name'] = sanitize_text_field( $args['category'] );
		}

		if ( ! empty( $args['tag'] ) && 'post' === $post_type ) {
			$query_args['tag'] = sanitize_text_field( $args['tag'] );
		}

		$query = new \WP_Query( $query_args );

		$items = array_map(
			fn( \WP_Post $post ) => $this->format_post( $post ),
			$query->posts
		);

		return array(
			'items'      => $items,
			'total'      => $query->found_posts,
			'pages'      => $query->max_num_pages,
			'pagination' => $pagination,
		);
	}

	/**
	 * @param mixed $data Cached data.
	 * @return array<string, mixed>
	 */
	protected function success( mixed $data, string $message = '' ): array {
		if ( is_array( $data ) && isset( $data['items'], $data['pagination'] ) ) {
			return $this->paginated_success(
				$data['items'],
				$data['total'],
				$data['pages'],
				$data['pagination']
			);
		}
		return parent::success( $data, $message );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_content_item_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'             => array(
					'type'        => 'integer',
					'description' => 'Unique post ID',
				),
				'title'          => array(
					'type'        => 'string',
					'description' => 'Content title',
				),
				'slug'           => array(
					'type'        => 'string',
					'description' => 'URL slug',
				),
				'status'         => array(
					'type'        => 'string',
					'description' => 'Publication status',
				),
				'type'           => array(
					'type'        => 'string',
					'description' => 'Post type',
				),
				'content'        => array(
					'type'        => 'string',
					'description' => 'Full content body',
				),
				'excerpt'        => array(
					'type'        => 'string',
					'description' => 'Content excerpt',
				),
				'author'         => array(
					'type'        => 'integer',
					'description' => 'Author user ID',
				),
				'date'           => array(
					'type'        => 'string',
					'description' => 'Publication date',
				),
				'modified'       => array(
					'type'        => 'string',
					'description' => 'Last modified date',
				),
				'permalink'      => array(
					'type'        => 'string',
					'description' => 'Full URL to view content',
				),
				'featured_image' => array(
					'type'        => 'integer',
					'description' => 'Featured image attachment ID',
				),
			),
		);
	}
}
