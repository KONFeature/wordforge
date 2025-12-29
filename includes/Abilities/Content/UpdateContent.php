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
        return __(
            'Modify an existing WordPress content item (post, page, or custom post type). Supports partial updates - ' .
            'only provide the fields you want to change, and other fields remain unchanged. Can update title, content, ' .
            'status, taxonomies, featured image, and custom fields. Set featured_image to 0 to remove it. Set meta values ' .
            'to null to delete them. Categories and tags are replaced entirely (not merged). Use this to edit existing ' .
            'content, change publication status, or update metadata.',
            'wordforge'
        );
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
                    'description' => 'Post ID of the content to update. Required to identify which content to modify.',
                    'minimum'     => 1,
                ],
                'title' => [
                    'type'        => 'string',
                    'description' => 'New title. Leave unset to keep existing title unchanged.',
                    'minLength'   => 1,
                    'maxLength'   => 255,
                ],
                'content' => [
                    'type'        => 'string',
                    'description' => 'New content body. Supports HTML and Gutenberg block syntax. Leave unset to keep existing content unchanged.',
                ],
                'excerpt' => [
                    'type'        => 'string',
                    'description' => 'New excerpt/summary. Leave unset to keep existing excerpt unchanged.',
                    'maxLength'   => 500,
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'New publication status: "publish" (make live), "draft" (unpublish), "pending" (submit for review), "private" (restricted access), "trash" (soft delete). Leave unset to keep current status.',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private', 'trash' ],
                ],
                'slug' => [
                    'type'        => 'string',
                    'description' => 'New URL slug. Warning: changing the slug changes the permalink/URL, which may break external links. Leave unset to keep existing slug.',
                    'pattern'     => '^[a-z0-9-]+$',
                    'maxLength'   => 200,
                ],
                'author' => [
                    'type'        => 'integer',
                    'description' => 'New author user ID to reassign content. User must have appropriate permissions. Leave unset to keep current author.',
                    'minimum'     => 1,
                ],
                'parent' => [
                    'type'        => 'integer',
                    'description' => 'New parent post ID for hierarchical content types (pages). Changes the hierarchy. Leave unset to keep current parent.',
                    'minimum'     => 0,
                ],
                'menu_order' => [
                    'type'        => 'integer',
                    'description' => 'New menu order position. Used for custom sorting of pages. Leave unset to keep current order.',
                ],
                'featured_image' => [
                    'type'        => 'integer',
                    'description' => 'New featured image attachment ID. Set to 0 (zero) to remove the featured image. Leave unset to keep current featured image. Set to null to remove.',
                    'minimum'     => 0,
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'New category assignments (completely replaces existing categories, does not merge). Provide category IDs or slugs. Leave unset to keep current categories. Applies only to posts.',
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
                    'description' => 'New tag assignments (completely replaces existing tags, does not merge). Provide tag names or slugs. Leave unset to keep current tags. Applies only to posts.',
                    'items'       => [
                        'type'        => 'string',
                        'description' => 'Tag name or slug',
                        'minLength'   => 1,
                        'maxLength'   => 200,
                    ],
                ],
                'meta' => [
                    'type'                 => 'object',
                    'description'          => 'Custom field updates. Provide key-value pairs to update. Set a value to null to delete that meta key. Only updates provided keys, other meta remains unchanged.',
                    'additionalProperties' => true,
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
