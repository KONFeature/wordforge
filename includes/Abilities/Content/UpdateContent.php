<?php
/**
 * Update Content Ability - Update an existing post, page, or custom post type.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to update existing content.
 */
class UpdateContent extends AbstractAbility {

    /**
     * {@inheritDoc}
     */
    public function get_title(): string {
        return __( 'Update Content', 'wordforge' );
    }

    /**
     * {@inheritDoc}
     */
    public function get_description(): string {
        return __( 'Update an existing post, page, or custom post type.', 'wordforge' );
    }

    /**
     * {@inheritDoc}
     */
    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'required'   => [ 'id' ],
            'properties' => [
                'id' => [
                    'type'        => 'integer',
                    'description' => 'The post ID to update.',
                ],
                'title' => [
                    'type'        => 'string',
                    'description' => 'The new title.',
                ],
                'content' => [
                    'type'        => 'string',
                    'description' => 'The new content body.',
                ],
                'excerpt' => [
                    'type'        => 'string',
                    'description' => 'The new excerpt.',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'The new status.',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private', 'trash' ],
                ],
                'slug' => [
                    'type'        => 'string',
                    'description' => 'The new slug.',
                ],
                'author' => [
                    'type'        => 'integer',
                    'description' => 'The new author user ID.',
                ],
                'parent' => [
                    'type'        => 'integer',
                    'description' => 'New parent post ID.',
                ],
                'menu_order' => [
                    'type'        => 'integer',
                    'description' => 'New menu order.',
                ],
                'featured_image' => [
                    'type'        => 'integer',
                    'description' => 'New featured image attachment ID (0 to remove).',
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'New category IDs or slugs (replaces existing).',
                    'items'       => [
                        'oneOf' => [
                            [ 'type' => 'integer' ],
                            [ 'type' => 'string' ],
                        ],
                    ],
                ],
                'tags' => [
                    'type'        => 'array',
                    'description' => 'New tag names (replaces existing).',
                    'items'       => [ 'type' => 'string' ],
                ],
                'meta' => [
                    'type'        => 'object',
                    'description' => 'Post meta to update.',
                ],
            ],
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function execute( array $args ): array {
        $post_id = (int) $args['id'];
        $post = get_post( $post_id );

        if ( ! $post ) {
            return $this->error( 'Content not found.', 'not_found' );
        }

        // Check capability for this post.
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return $this->error(
                'You do not have permission to edit this content.',
                'forbidden'
            );
        }

        $post_data = [ 'ID' => $post_id ];

        // Only update fields that are provided.
        if ( isset( $args['title'] ) ) {
            $post_data['post_title'] = sanitize_text_field( $args['title'] );
        }

        if ( isset( $args['content'] ) ) {
            $post_data['post_content'] = wp_kses_post( $args['content'] );
        }

        if ( isset( $args['excerpt'] ) ) {
            $post_data['post_excerpt'] = sanitize_textarea_field( $args['excerpt'] );
        }

        if ( isset( $args['status'] ) ) {
            $post_data['post_status'] = $args['status'];
        }

        if ( isset( $args['slug'] ) ) {
            $post_data['post_name'] = sanitize_title( $args['slug'] );
        }

        if ( isset( $args['author'] ) ) {
            $post_data['post_author'] = (int) $args['author'];
        }

        if ( isset( $args['parent'] ) ) {
            $post_data['post_parent'] = (int) $args['parent'];
        }

        if ( isset( $args['menu_order'] ) ) {
            $post_data['menu_order'] = (int) $args['menu_order'];
        }

        // Update the post.
        $result = wp_update_post( $post_data, true );

        if ( is_wp_error( $result ) ) {
            return $this->error( $result->get_error_message(), 'update_failed' );
        }

        // Handle featured image.
        if ( array_key_exists( 'featured_image', $args ) ) {
            if ( $args['featured_image'] === 0 || $args['featured_image'] === null ) {
                delete_post_thumbnail( $post_id );
            } else {
                set_post_thumbnail( $post_id, (int) $args['featured_image'] );
            }
        }

        // Update categories.
        if ( isset( $args['categories'] ) && 'post' === $post->post_type ) {
            $this->set_categories( $post_id, $args['categories'] );
        }

        // Update tags.
        if ( isset( $args['tags'] ) && 'post' === $post->post_type ) {
            wp_set_post_tags( $post_id, $args['tags'] );
        }

        // Update meta.
        if ( ! empty( $args['meta'] ) && is_array( $args['meta'] ) ) {
            foreach ( $args['meta'] as $key => $value ) {
                if ( $value === null ) {
                    delete_post_meta( $post_id, sanitize_key( $key ) );
                } else {
                    update_post_meta( $post_id, sanitize_key( $key ), $value );
                }
            }
        }

        $updated_post = get_post( $post_id );

        return $this->success(
            $this->format_post( $updated_post ),
            sprintf( 'Updated "%s" successfully.', $updated_post->post_title )
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

        wp_set_post_categories( $post_id, $category_ids );
    }
}
