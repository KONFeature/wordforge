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
            'Create WordPress posts, pages, or custom post types with HTML/Gutenberg content, taxonomies, and metadata. Defaults to draft status.',
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
                    'description' => 'Content title displayed as main heading. Auto-generates slug if not provided.',
                    'minLength'   => 1,
                    'maxLength'   => 255,
                ],
                'content' => [
                    'type'        => 'string',
                    'description' => 'Main content body supporting HTML and Gutenberg blocks. Use <!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph --> for blocks.',
                    'default'     => '',
                ],
                'excerpt' => [
                    'type'        => 'string',
                    'description' => 'Short summary shown in archives and search. Auto-generated if omitted.',
                    'maxLength'   => 500,
                ],
                'post_type' => [
                    'type'        => 'string',
                    'description' => 'Content type: "post" for blog posts, "page" for static pages, or custom post type slug.',
                    'default'     => 'post',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'Publication status: "publish" (live), "draft" (private), "pending" (review), "private" (read_private_posts only).',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private' ],
                    'default'     => 'draft',
                ],
                'slug' => [
                    'type'        => 'string',
                    'description' => 'URL slug used in permalink, e.g., "my-post". Auto-generated from title if omitted.',
                    'pattern'     => '^[a-z0-9-]+$',
                    'maxLength'   => 200,
                ],
                'author' => [
                    'type'        => 'integer',
                    'description' => 'User ID to attribute as author. Defaults to current user.',
                    'minimum'     => 1,
                ],
                'parent' => [
                    'type'        => 'integer',
                    'description' => 'Parent content ID for hierarchical types. Creates hierarchy in navigation.',
                    'minimum'     => 0,
                ],
                'menu_order' => [
                    'type'        => 'integer',
                    'description' => 'Manual sort position (lower first). Used for pages in navigation.',
                    'default'     => 0,
                ],
                'featured_image' => [
                    'type'        => 'integer',
                    'description' => 'Featured image attachment ID. Upload media first to get ID.',
                    'minimum'     => 1,
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'Category assignments. Provide category IDs or slugs.',
                    'items'       => [
                        'oneOf' => [
                            [
                                'type'        => 'integer',
                                'description' => 'Category term ID',
                                'minimum'     => 1,
                            ],
                            [
                                'type'        => 'string',
                                'description' => 'Category slug',
                                'pattern'     => '^[a-z0-9-]+$',
                            ],
                        ],
                    ],
                ],
                'tags' => [
                    'type'        => 'array',
                    'description' => 'Tag assignments. Provide tag names or slugs. Created automatically if missing.',
                    'items'       => [
                        'type'        => 'string',
                        'description' => 'Tag name or slug',
                        'minLength'   => 1,
                        'maxLength'   => 200,
                    ],
                ],
                'meta' => [
                    'type'                 => 'object',
                    'description'          => 'Custom field key-value pairs. Prefix keys to avoid conflicts.',
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
