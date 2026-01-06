<?php
/**
 * Content Ability - List or get WordPress content (posts, pages, CPTs).
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
		return __( 'Content', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'List or get WordPress content (posts, pages, CPTs). Provide "id" or "slug" to get a single item with full details; ' .
			'omit both to list/search content. Returns metadata, taxonomies, custom fields. ' .
			'NOT FOR: Block editing (use get-blocks/update-blocks), creating/updating (use save-content).',
			'wordforge'
		);
	}

	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			array(
				'type'       => 'object',
				'properties' => array(
					'id'         => array( 'type' => 'integer' ),
					'title'      => array( 'type' => 'string' ),
					'slug'       => array( 'type' => 'string' ),
					'status'     => array( 'type' => 'string' ),
					'type'       => array( 'type' => 'string' ),
					'excerpt'    => array( 'type' => 'string' ),
					'author'     => array( 'type' => 'integer' ),
					'date'       => array( 'type' => 'string' ),
					'modified'   => array( 'type' => 'string' ),
					'permalink'  => array( 'type' => 'string' ),
					'taxonomies' => array( 'type' => 'object' ),
					'meta'       => array( 'type' => 'object' ),
				),
			),
			'Content items.'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
					'id'        => array(
						'type'        => 'integer',
						'description' => 'Content ID. If provided, returns single item with full details.',
						'minimum'     => 1,
					),
					'slug'      => array(
						'type'        => 'string',
						'description' => 'Content slug. If provided (and no id), returns single item with full details.',
						'pattern'     => '^[a-z0-9-]+$',
					),
					'post_type' => array(
						'type'        => 'string',
						'description' => 'Content type: "post", "page", or custom post type slug.',
						'default'     => 'post',
					),
					'status'    => array(
						'type'        => 'string',
						'description' => 'publish=live, draft=hidden, pending=review, private=admin-only.',
						'enum'        => array( 'publish', 'draft', 'pending', 'private', 'trash', 'any' ),
						'default'     => 'any',
					),
					'search'    => array(
						'type'        => 'string',
						'description' => 'Search in title, content, excerpt.',
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
		if ( ! empty( $args['id'] ) || ! empty( $args['slug'] ) ) {
			return $this->get_single_content( $args );
		}

		return $this->list_content( $args );
	}

	private function get_single_content( array $args ): array {
		$post_type = $args['post_type'] ?? 'post';

		if ( ! empty( $args['id'] ) ) {
			$post = get_post( (int) $args['id'] );
		} else {
			$posts = get_posts(
				array(
					'name'           => $args['slug'],
					'post_type'      => $post_type,
					'post_status'    => 'any',
					'posts_per_page' => 1,
				)
			);
			$post  = $posts[0] ?? null;
		}

		if ( ! $post ) {
			return $this->error( 'Content not found.', 'not_found' );
		}

		if ( ! empty( $args['id'] ) && 'post' !== $post_type && $post->post_type !== $post_type ) {
			return $this->error(
				sprintf( 'Content #%d is type "%s", not "%s".', $args['id'], $post->post_type, $post_type ),
				'type_mismatch'
			);
		}

		return $this->paginated_success(
			array( $this->format_single_content( $post ) ),
			1,
			1,
			array(
				'page'     => 1,
				'per_page' => 1,
			)
		);
	}

	private function list_content( array $args ): array {
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
			fn( \WP_Post $post ) => $this->format_list_item( $post ),
			$query->posts
		);

		return array(
			'items'      => $items,
			'total'      => $query->found_posts,
			'pages'      => $query->max_num_pages,
			'pagination' => $pagination,
		);
	}

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

	private function format_list_item( \WP_Post $post ): array {
		$data = array(
			'id'        => $post->ID,
			'title'     => $post->post_title,
			'slug'      => $post->post_name,
			'status'    => $post->post_status,
			'type'      => $post->post_type,
			'excerpt'   => $post->post_excerpt,
			'author'    => (int) $post->post_author,
			'date'      => $post->post_date,
			'modified'  => $post->post_modified,
			'permalink' => get_permalink( $post->ID ),
		);

		$featured_image = get_post_thumbnail_id( $post->ID );
		if ( $featured_image ) {
			$data['featured_image'] = $featured_image;
		}

		return $data;
	}

	private function format_single_content( \WP_Post $post ): array {
		$data = array(
			'id'         => $post->ID,
			'title'      => $post->post_title,
			'slug'       => $post->post_name,
			'status'     => $post->post_status,
			'type'       => $post->post_type,
			'excerpt'    => $post->post_excerpt,
			'author'     => (int) $post->post_author,
			'date'       => $post->post_date,
			'modified'   => $post->post_modified,
			'parent'     => $post->post_parent,
			'permalink'  => get_permalink( $post->ID ),
			'taxonomies' => $this->get_post_taxonomies( $post ),
			'meta'       => $this->get_post_meta( $post->ID ),
		);

		$featured_image = get_post_thumbnail_id( $post->ID );
		if ( $featured_image ) {
			$data['featured_image'] = $featured_image;
		}

		return $data;
	}

	private function get_post_taxonomies( \WP_Post $post ): array {
		$taxonomies = get_object_taxonomies( $post->post_type, 'names' );
		$result     = array();

		foreach ( $taxonomies as $taxonomy ) {
			$terms = get_the_terms( $post->ID, $taxonomy );
			if ( $terms && ! is_wp_error( $terms ) ) {
				$result[ $taxonomy ] = array_map(
					fn( \WP_Term $term ) => array(
						'id'   => $term->term_id,
						'name' => $term->name,
						'slug' => $term->slug,
					),
					$terms
				);
			}
		}

		return $result;
	}

	private function get_post_meta( int $post_id ): array {
		$meta   = get_post_meta( $post_id );
		$result = array();

		foreach ( $meta as $key => $values ) {
			if ( str_starts_with( $key, '_' ) ) {
				continue;
			}
			$result[ $key ] = count( $values ) === 1 ? $values[0] : $values;
		}

		return $result;
	}
}
