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
        return __( 'Create a new post, page, or custom post type.', 'wordforge' );
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
    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'required'   => [ 'title' ],
            'properties' => [
                'title' => [
                    'type'        => 'string',
                    'description' => 'The content title.',
                ],
                'content' => [
                    'type'        => 'string',
                    'description' => 'The content body (supports HTML and Gutenberg blocks).',
                    'default'     => '',
                ],
                'excerpt' => [
                    'type'        => 'string',
                    'description' => 'The content excerpt.',
                ],
                'post_type' => [
                    'type'        => 'string',
                    'description' => 'The post type.',
                    'default'     => 'post',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'The post status.',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private' ],
                    'default'     => 'draft',
                ],
                'slug' => [
                    'type'        => 'string',
                    'description' => 'The post slug (auto-generated from title if not provided).',
                ],
                'author' => [
                    'type'        => 'integer',
                    'description' => 'The author user ID.',
                ],
                'parent' => [
                    'type'        => 'integer',
                    'description' => 'Parent post ID (for hierarchical post types).',
                ],
                'menu_order' => [
                    'type'        => 'integer',
                    'description' => 'Menu order for pages.',
                    'default'     => 0,
                ],
                'featured_image' => [
                    'type'        => 'integer',
                    'description' => 'Featured image attachment ID.',
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'Category IDs or slugs (for posts).',
                    'items'       => [
                        'oneOf' => [
                            [ 'type' => 'integer' ],
                            [ 'type' => 'string' ],
                        ],
                    ],
                ],
                'tags' => [
                    'type'        => 'array',
                    'description' => 'Tag names or slugs (for posts).',
                    'items'       => [ 'type' => 'string' ],
                ],
                'meta' => [
                    'type'        => 'object',
                    'description' => 'Post meta to set.',
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
