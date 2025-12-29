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
        return __(
            'Retrieve a list of WordPress content items (posts, pages, or custom post types) with powerful filtering, ' .
            'searching, and sorting capabilities. Supports pagination for large result sets. Use this to browse content, ' .
            'find specific items by search terms, filter by author/category/tag/status, or get recently modified content. ' .
            'Returns up to 100 items per page with pagination metadata for navigating through larger collections.',
            'wordforge'
        );
    }

    /**
     * {@inheritDoc}
     */
    public function get_output_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'success' => [
                    'type'        => 'boolean',
                    'description' => 'Whether the query executed successfully.',
                ],
                'data' => [
                    'type'        => 'object',
                    'description' => 'Query results with pagination metadata.',
                    'properties'  => [
                        'items' => [
                            'type'        => 'array',
                            'description' => 'Array of content items matching the query filters. Empty array if no matches found.',
                            'items'       => [
                                'type'       => 'object',
                                'properties' => [
                                    'id'             => [ 'type' => 'integer', 'description' => 'Unique post ID' ],
                                    'title'          => [ 'type' => 'string', 'description' => 'Content title' ],
                                    'slug'           => [ 'type' => 'string', 'description' => 'URL slug' ],
                                    'status'         => [ 'type' => 'string', 'description' => 'Publication status' ],
                                    'type'           => [ 'type' => 'string', 'description' => 'Post type' ],
                                    'content'        => [ 'type' => 'string', 'description' => 'Full content body' ],
                                    'excerpt'        => [ 'type' => 'string', 'description' => 'Content excerpt' ],
                                    'author'         => [ 'type' => 'integer', 'description' => 'Author user ID' ],
                                    'date'           => [ 'type' => 'string', 'description' => 'Publication date (YYYY-MM-DD HH:MM:SS)' ],
                                    'modified'       => [ 'type' => 'string', 'description' => 'Last modified date (YYYY-MM-DD HH:MM:SS)' ],
                                    'permalink'      => [ 'type' => 'string', 'description' => 'Full URL to view content' ],
                                    'featured_image' => [
                                        'type'        => [ 'integer', 'null' ],
                                        'description' => 'Featured image attachment ID or null',
                                    ],
                                ],
                            ],
                        ],
                        'total' => [
                            'type'        => 'integer',
                            'description' => 'Total number of items matching the query across all pages. Use this with per_page to calculate total pages.',
                        ],
                        'total_pages' => [
                            'type'        => 'integer',
                            'description' => 'Total number of pages available based on per_page setting. If this is greater than "page", more results are available.',
                        ],
                        'page' => [
                            'type'        => 'integer',
                            'description' => 'Current page number (1-indexed).',
                        ],
                        'per_page' => [
                            'type'        => 'integer',
                            'description' => 'Number of items per page (max 100).',
                        ],
                    ],
                    'required'    => [ 'items', 'total', 'total_pages', 'page', 'per_page' ],
                ],
            ],
            'required'   => [ 'success', 'data' ],
        ];
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
                    'description' => 'Content type to list: "post" for blog posts, "page" for pages, or any registered custom post type slug.',
                    'default'     => 'post',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'Filter by publication status: "publish" (live content), "draft" (unpublished), "pending" (awaiting review), "private" (restricted access), "trash" (deleted items), "any" (all statuses). Defaults to "any" to show all content regardless of status.',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private', 'trash', 'any' ],
                    'default'     => 'any',
                ],
                'per_page' => [
                    'type'        => 'integer',
                    'description' => 'Number of items to return per page. Use smaller values (10-20) for quick previews, larger values (50-100) for comprehensive lists. Maximum 100 items per request.',
                    'default'     => 20,
                    'minimum'     => 1,
                    'maximum'     => 100,
                ],
                'page' => [
                    'type'        => 'integer',
                    'description' => 'Page number for pagination (1-indexed). Use with "total_pages" in the response to navigate through large result sets. Page 1 returns the first set of results.',
                    'default'     => 1,
                    'minimum'     => 1,
                ],
                'search' => [
                    'type'        => 'string',
                    'description' => 'Search term to filter content by title, content, or excerpt. Performs a full-text search across content fields. Leave empty to return all items without search filtering.',
                    'minLength'   => 1,
                    'maxLength'   => 200,
                ],
                'orderby' => [
                    'type'        => 'string',
                    'description' => 'Sort results by field: "date" (publication date, newest first by default), "title" (alphabetical), "modified" (last edit date), "menu_order" (custom page ordering), "id" (creation order).',
                    'enum'        => [ 'date', 'title', 'modified', 'menu_order', 'id' ],
                    'default'     => 'date',
                ],
                'order' => [
                    'type'        => 'string',
                    'description' => 'Sort direction: "desc" (descending, Z-A or newest first), "asc" (ascending, A-Z or oldest first). Combine with "orderby" to control result ordering.',
                    'enum'        => [ 'asc', 'desc' ],
                    'default'     => 'desc',
                ],
                'author' => [
                    'type'        => 'integer',
                    'description' => 'Filter results to show only content by a specific author. Provide the WordPress user ID. Leave empty to show content from all authors.',
                    'minimum'     => 1,
                ],
                'category' => [
                    'type'        => 'string',
                    'description' => 'Filter posts by category slug (e.g., "technology", "news"). Only applicable to posts and post types that support categories. Leave empty for no category filtering.',
                    'pattern'     => '^[a-z0-9-]+$',
                ],
                'tag' => [
                    'type'        => 'string',
                    'description' => 'Filter posts by tag slug (e.g., "wordpress", "tutorial"). Only applicable to posts and post types that support tags. Leave empty for no tag filtering.',
                    'pattern'     => '^[a-z0-9-]+$',
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
