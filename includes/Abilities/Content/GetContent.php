<?php
/**
 * Get Content Ability - Get a single post, page, or custom post type.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to get a single content item.
 */
class GetContent extends AbstractAbility {

    protected function is_read_only(): bool {
        return true;
    }

    /**
     * {@inheritDoc}
     */
    public function get_title(): string {
        return __( 'Get Content', 'wordforge' );
    }

    /**
     * {@inheritDoc}
     */
    public function get_description(): string {
        return __(
            'Retrieve detailed information about a single WordPress content item (post, page, or custom post type). ' .
            'Can fetch by either post ID or slug. Optionally includes post metadata (custom fields) and taxonomy terms ' .
            '(categories, tags). Use this to view full content details, check current values before updates, or retrieve ' .
            'content for editing. Returns complete content including all fields from the WordPress post object.',
            'wordforge'
        );
    }

    /**
     * {@inheritDoc}
     */
    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'id' => [
                    'type'        => 'integer',
                    'description' => 'Post ID to retrieve. Most direct method when you know the ID. Provide either "id" OR "slug" + "post_type".',
                    'minimum'     => 1,
                ],
                'slug' => [
                    'type'        => 'string',
                    'description' => 'URL slug to retrieve (e.g., "my-post"). Requires "post_type" to be specified. Useful when you know the permalink but not the ID.',
                    'pattern'     => '^[a-z0-9-]+$',
                ],
                'post_type' => [
                    'type'        => 'string',
                    'description' => 'Post type when searching by slug. Required when using "slug" parameter. Examples: "post", "page", or any custom post type.',
                    'default'     => 'post',
                ],
                'include_meta' => [
                    'type'        => 'boolean',
                    'description' => 'Include custom fields (post meta) in the response. Set to true to retrieve all non-internal meta keys and their values. Internal meta (keys starting with "_") are excluded for security.',
                    'default'     => false,
                ],
                'include_taxonomies' => [
                    'type'        => 'boolean',
                    'description' => 'Include taxonomy terms (categories, tags, custom taxonomies) in the response. Set to true to get all terms assigned to this content, grouped by taxonomy.',
                    'default'     => false,
                ],
            ],
            'oneOf'      => [
                [ 'required' => [ 'id' ] ],
                [ 'required' => [ 'slug', 'post_type' ] ],
            ],
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function execute( array $args ): array {
        $post = null;

        if ( ! empty( $args['id'] ) ) {
            $post = get_post( (int) $args['id'] );
        } elseif ( ! empty( $args['slug'] ) ) {
            $post_type = $args['post_type'] ?? 'post';
            
            $posts = get_posts( [
                'name'           => sanitize_title( $args['slug'] ),
                'post_type'      => $post_type,
                'post_status'    => 'any',
                'posts_per_page' => 1,
            ] );
            
            $post = $posts[0] ?? null;
        }

        if ( ! $post ) {
            return $this->error( 'Content not found.', 'not_found' );
        }

        $data = $this->format_post( $post );

        // Include meta if requested.
        if ( ! empty( $args['include_meta'] ) ) {
            $data['meta'] = $this->get_post_meta( $post->ID );
        }

        // Include taxonomies if requested.
        if ( ! empty( $args['include_taxonomies'] ) ) {
            $data['taxonomies'] = $this->get_post_taxonomies( $post );
        }

        return $this->success( $data );
    }

    /**
     * Get post meta as an associative array.
     *
     * @param int $post_id The post ID.
     * @return array<string, mixed>
     */
    private function get_post_meta( int $post_id ): array {
        $meta = get_post_meta( $post_id );
        $result = [];

        foreach ( $meta as $key => $values ) {
            // Skip internal meta keys.
            if ( str_starts_with( $key, '_' ) ) {
                continue;
            }
            
            $result[ $key ] = count( $values ) === 1 ? $values[0] : $values;
        }

        return $result;
    }

    /**
     * Get post taxonomy terms.
     *
     * @param \WP_Post $post The post object.
     * @return array<string, array<string, mixed>>
     */
    private function get_post_taxonomies( \WP_Post $post ): array {
        $taxonomies = get_object_taxonomies( $post->post_type, 'names' );
        $result = [];

        foreach ( $taxonomies as $taxonomy ) {
            $terms = get_the_terms( $post->ID, $taxonomy );
            
            if ( $terms && ! is_wp_error( $terms ) ) {
                $result[ $taxonomy ] = array_map(
                    fn( \WP_Term $term ) => [
                        'id'   => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug,
                    ],
                    $terms
                );
            }
        }

        return $result;
    }
}
