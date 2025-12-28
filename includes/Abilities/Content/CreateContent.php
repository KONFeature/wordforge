<?php
/**
 * Create Content Ability - Create a new post, page, or custom post type.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to create new content.
 */
class CreateContent extends AbstractAbility {

    /**
     * {@inheritDoc}
     */
    public function get_title(): string {
        return __( 'Create Content', 'wordforge' );
    }

    /**
     * {@inheritDoc}
     */
    public function get_description(): string {
        return __(
            'Create new WordPress content including blog posts, pages, and custom post types. ' .
            'Supports full content formatting with HTML and Gutenberg blocks, taxonomy assignment ' .
            '(categories/tags), featured images, author attribution, and custom fields. ' .
            'New content defaults to "draft" status for safety. Use this ability when you need ' .
            'to publish new articles, pages, or custom content types.',
            'wordforge'
        );
    }

    /**
     * {@inheritDoc}
     */
    public function get_capability(): string {
        return 'publish_posts';
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
                    'description' => 'Whether the content was created successfully.',
                ],
                'data' => [
                    'type'        => 'object',
                    'description' => 'Created content details.',
                    'properties'  => [
                        'id' => [
                            'type'        => 'integer',
                            'description' => 'Unique post ID for the created content.',
                        ],
                        'title' => [
                            'type'        => 'string',
                            'description' => 'Content title.',
                        ],
                        'slug' => [
                            'type'        => 'string',
                            'description' => 'URL slug (generated or provided).',
                        ],
                        'status' => [
                            'type'        => 'string',
                            'description' => 'Current publication status.',
                        ],
                        'type' => [
                            'type'        => 'string',
                            'description' => 'Post type.',
                        ],
                        'permalink' => [
                            'type'        => 'string',
                            'description' => 'Full URL to view the content on the frontend.',
                        ],
                        'author' => [
                            'type'        => 'integer',
                            'description' => 'Author user ID.',
                        ],
                        'date' => [
                            'type'        => 'string',
                            'description' => 'Publication date in site timezone (YYYY-MM-DD HH:MM:SS).',
                        ],
                        'featured_image' => [
                            'type'        => [ 'integer', 'null' ],
                            'description' => 'Featured image attachment ID, or null if none set.',
                        ],
                    ],
                ],
                'message' => [
                    'type'        => 'string',
                    'description' => 'Human-readable success message.',
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
            'required'   => [ 'title' ],
            'properties' => [
                'title' => [
                    'type'        => 'string',
                    'description' => 'Content title displayed as the main heading. Will be used to auto-generate the slug if not provided.',
                    'minLength'   => 1,
                    'maxLength'   => 255,
                ],
                'content' => [
                    'type'        => 'string',
                    'description' => 'Main content body supporting both HTML markup and Gutenberg block syntax. For blocks, use HTML comment syntax: <!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph -->. Can be empty to create a placeholder draft.',
                    'default'     => '',
                ],
                'excerpt' => [
                    'type'        => 'string',
                    'description' => 'Short summary or teaser text shown in archives and search results. Auto-generated from content if not provided.',
                    'maxLength'   => 500,
                ],
                'post_type' => [
                    'type'        => 'string',
                    'description' => 'Content type: "post" for blog posts, "page" for static pages, or any registered custom post type slug. Different post types may have different capabilities and features.',
                    'default'     => 'post',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'Publication status: "publish" (immediately live and visible to all), "draft" (saved privately for editing), "pending" (awaiting editorial review), "private" (published but only visible to users with read_private_posts capability). Defaults to "draft" for safety.',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private' ],
                    'default'     => 'draft',
                ],
                'slug' => [
                    'type'        => 'string',
                    'description' => 'URL-friendly slug used in the permalink (e.g., "my-post" in /my-post/). Auto-generated from title if omitted. Use lowercase letters, numbers, and hyphens only.',
                    'pattern'     => '^[a-z0-9-]+$',
                    'maxLength'   => 200,
                ],
                'author' => [
                    'type'        => 'integer',
                    'description' => 'WordPress user ID to attribute as content author. Must have appropriate publishing capabilities. Defaults to current user if not specified.',
                    'minimum'     => 1,
                ],
                'parent' => [
                    'type'        => 'integer',
                    'description' => 'Parent content ID for hierarchical post types (e.g., pages). Creates a hierarchy visible in navigation and breadcrumbs. Only applicable to hierarchical types.',
                    'minimum'     => 0,
                ],
                'menu_order' => [
                    'type'        => 'integer',
                    'description' => 'Numeric position for manual sorting (lower numbers appear first). Primarily used for pages in navigation menus. 0 means no specific order.',
                    'default'     => 0,
                ],
                'featured_image' => [
                    'type'        => 'integer',
                    'description' => 'Media attachment ID to use as the featured/thumbnail image. Upload media first using the upload-media ability to get an ID. Displayed prominently in archives and at the top of single content views.',
                    'minimum'     => 1,
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'Category assignments for posts. Can provide category IDs (integers) or slugs (strings). Creates hierarchical organization. Only applicable to posts and post types supporting categories.',
                    'items'       => [
                        'oneOf' => [
                            [
                                'type'        => 'integer',
                                'description' => 'Category term ID',
                                'minimum'     => 1,
                            ],
                            [
                                'type'        => 'string',
                                'description' => 'Category slug (e.g., "technology", "news")',
                                'pattern'     => '^[a-z0-9-]+$',
                            ],
                        ],
                    ],
                ],
                'tags' => [
                    'type'        => 'array',
                    'description' => 'Tag assignments for posts. Provide tag names or slugs as strings. Tags are created automatically if they don\'t exist. Used for non-hierarchical content classification.',
                    'items'       => [
                        'type'        => 'string',
                        'description' => 'Tag name or slug',
                        'minLength'   => 1,
                        'maxLength'   => 200,
                    ],
                ],
                'meta' => [
                    'type'                 => 'object',
                    'description'          => 'Custom field key-value pairs for storing additional metadata. Keys should be prefixed to avoid conflicts (e.g., "my_plugin_field"). Values can be strings, numbers, booleans, or nested objects/arrays.',
                    'additionalProperties' => true,
                ],
            ],
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function execute( array $args ): array {
        $post_type = $args['post_type'] ?? 'post';

        // Validate post type.
        if ( ! post_type_exists( $post_type ) ) {
            return $this->error(
                sprintf( 'Post type "%s" does not exist.', $post_type ),
                'invalid_post_type'
            );
        }

        // Check capability for this post type.
        $post_type_obj = get_post_type_object( $post_type );
        if ( ! current_user_can( $post_type_obj->cap->publish_posts ) ) {
            return $this->error(
                'You do not have permission to create this content type.',
                'forbidden'
            );
        }

        $post_data = [
            'post_title'   => sanitize_text_field( $args['title'] ),
            'post_content' => wp_kses_post( $args['content'] ?? '' ),
            'post_type'    => $post_type,
            'post_status'  => $args['status'] ?? 'draft',
            'post_author'  => $args['author'] ?? get_current_user_id(),
            'menu_order'   => (int) ( $args['menu_order'] ?? 0 ),
        ];

        if ( ! empty( $args['excerpt'] ) ) {
            $post_data['post_excerpt'] = sanitize_textarea_field( $args['excerpt'] );
        }

        if ( ! empty( $args['slug'] ) ) {
            $post_data['post_name'] = sanitize_title( $args['slug'] );
        }

        if ( ! empty( $args['parent'] ) ) {
            $post_data['post_parent'] = (int) $args['parent'];
        }

        // Insert the post.
        $post_id = wp_insert_post( $post_data, true );

        if ( is_wp_error( $post_id ) ) {
            return $this->error( $post_id->get_error_message(), 'insert_failed' );
        }

        // Set featured image.
        if ( ! empty( $args['featured_image'] ) ) {
            set_post_thumbnail( $post_id, (int) $args['featured_image'] );
        }

        // Set categories.
        if ( ! empty( $args['categories'] ) && 'post' === $post_type ) {
            $this->set_categories( $post_id, $args['categories'] );
        }

        // Set tags.
        if ( ! empty( $args['tags'] ) && 'post' === $post_type ) {
            wp_set_post_tags( $post_id, $args['tags'] );
        }

        // Set meta.
        if ( ! empty( $args['meta'] ) && is_array( $args['meta'] ) ) {
            foreach ( $args['meta'] as $key => $value ) {
                update_post_meta( $post_id, sanitize_key( $key ), $value );
            }
        }

        $post = get_post( $post_id );

        return $this->success(
            $this->format_post( $post ),
            sprintf( 'Created %s "%s" successfully.', $post_type, $post->post_title )
        );
    }

    /**
     * Set categories by ID or slug.
     *
     * @param int   $post_id    The post ID.
     * @param array $categories Category IDs or slugs.
     * @return void
     */
    private function set_categories( int $post_id, array $categories ): void {
        $category_ids = [];

        foreach ( $categories as $cat ) {
            if ( is_numeric( $cat ) ) {
                $category_ids[] = (int) $cat;
            } else {
                $term = get_term_by( 'slug', $cat, 'category' );
                if ( $term ) {
                    $category_ids[] = $term->term_id;
                }
            }
        }

        if ( ! empty( $category_ids ) ) {
            wp_set_post_categories( $post_id, $category_ids );
        }
    }
}
