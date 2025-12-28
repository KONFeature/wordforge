<?php
/**
 * List Content Ability - List posts, pages, or custom post types.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to list content items.
 */
class ListContent extends AbstractAbility {

    protected function is_read_only(): bool {
        return true;
    }

    /**
     * {@inheritDoc}
     */
    public function get_title(): string {
        return __( 'List Content', 'wordforge' );
    }

    /**
     * {@inheritDoc}
     */
    public function get_description(): string {
        return __( 'List posts, pages, or any custom post type with filtering and pagination.', 'wordforge' );
    }

    /**
     * {@inheritDoc}
     */
    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'post_type' => [
                    'type'        => 'string',
                    'description' => 'The post type to list (post, page, or custom post type).',
                    'default'     => 'post',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'Filter by post status.',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private', 'trash', 'any' ],
                    'default'     => 'any',
                ],
                'per_page' => [
                    'type'        => 'integer',
                    'description' => 'Number of items per page.',
                    'default'     => 20,
                    'minimum'     => 1,
                    'maximum'     => 100,
                ],
                'page' => [
                    'type'        => 'integer',
                    'description' => 'Page number.',
                    'default'     => 1,
                    'minimum'     => 1,
                ],
                'search' => [
                    'type'        => 'string',
                    'description' => 'Search term to filter content.',
                ],
                'orderby' => [
                    'type'        => 'string',
                    'description' => 'Field to order by.',
                    'enum'        => [ 'date', 'title', 'modified', 'menu_order', 'id' ],
                    'default'     => 'date',
                ],
                'order' => [
                    'type'        => 'string',
                    'description' => 'Order direction.',
                    'enum'        => [ 'asc', 'desc' ],
                    'default'     => 'desc',
                ],
                'author' => [
                    'type'        => 'integer',
                    'description' => 'Filter by author ID.',
                ],
                'category' => [
                    'type'        => 'string',
                    'description' => 'Filter by category slug (for posts).',
                ],
                'tag' => [
                    'type'        => 'string',
                    'description' => 'Filter by tag slug (for posts).',
                ],
            ],
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function execute( array $args ): array {
        $post_type = $args['post_type'] ?? 'post';
        
        // Validate post type exists.
        if ( ! post_type_exists( $post_type ) ) {
            return $this->error(
                sprintf( 'Post type "%s" does not exist.', $post_type ),
                'invalid_post_type'
            );
        }

        $query_args = [
            'post_type'      => $post_type,
            'post_status'    => $args['status'] ?? 'any',
            'posts_per_page' => min( (int) ( $args['per_page'] ?? 20 ), 100 ),
            'paged'          => max( (int) ( $args['page'] ?? 1 ), 1 ),
            'orderby'        => $args['orderby'] ?? 'date',
            'order'          => strtoupper( $args['order'] ?? 'desc' ),
        ];

        // Optional filters.
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

        return $this->success( [
            'items'       => $items,
            'total'       => $query->found_posts,
            'total_pages' => $query->max_num_pages,
            'page'        => $query_args['paged'],
            'per_page'    => $query_args['posts_per_page'],
        ] );
    }
}
