<?php
/**
 * Abstract Ability - Base class for all WordForge abilities.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities;

/**
 * Abstract base class for WordForge abilities.
 */
abstract class AbstractAbility {

    /**
     * Get the ability title.
     *
     * @return string
     */
    abstract public function get_title(): string;

    /**
     * Get the ability description.
     *
     * @return string
     */
    abstract public function get_description(): string;

    /**
     * Get the input schema for the ability.
     *
     * @return array<string, mixed>
     */
    abstract public function get_input_schema(): array;

    /**
     * Execute the ability.
     *
     * @param array<string, mixed> $args The input arguments.
     * @return array<string, mixed> The result.
     */
    abstract public function execute( array $args ): array;

    /**
     * Get the capability required to use this ability.
     *
     * @return string
     */
    public function get_capability(): string {
        return 'edit_posts';
    }

    /**
     * Check if the current user has permission to use this ability.
     *
     * @return bool
     */
    public function check_permission(): bool {
        return current_user_can( $this->get_capability() );
    }

    /**
     * Register the ability with WordPress.
     *
     * @param string $name The ability name (e.g., 'wordforge/list-content').
     * @return void
     */
    public function register( string $name ): void {
        if ( ! function_exists( 'register_ability' ) ) {
            return;
        }

        register_ability(
            $name,
            [
                'title'               => $this->get_title(),
                'description'         => $this->get_description(),
                'input_schema'        => $this->get_input_schema(),
                'permission_callback' => [ $this, 'check_permission' ],
                'execute_callback'    => [ $this, 'execute' ],
            ]
        );
    }

    /**
     * Create a success response.
     *
     * @param mixed  $data    The response data.
     * @param string $message Optional success message.
     * @return array<string, mixed>
     */
    protected function success( mixed $data, string $message = '' ): array {
        $response = [
            'success' => true,
            'data'    => $data,
        ];

        if ( $message ) {
            $response['message'] = $message;
        }

        return $response;
    }

    /**
     * Create an error response.
     *
     * @param string $message The error message.
     * @param string $code    Optional error code.
     * @return array<string, mixed>
     */
    protected function error( string $message, string $code = 'error' ): array {
        return [
            'success' => false,
            'error'   => [
                'code'    => $code,
                'message' => $message,
            ],
        ];
    }

    /**
     * Format a post for response.
     *
     * @param \WP_Post $post The post object.
     * @return array<string, mixed>
     */
    protected function format_post( \WP_Post $post ): array {
        return [
            'id'             => $post->ID,
            'title'          => $post->post_title,
            'slug'           => $post->post_name,
            'status'         => $post->post_status,
            'type'           => $post->post_type,
            'content'        => $post->post_content,
            'excerpt'        => $post->post_excerpt,
            'author'         => (int) $post->post_author,
            'date'           => $post->post_date,
            'date_gmt'       => $post->post_date_gmt,
            'modified'       => $post->post_modified,
            'modified_gmt'   => $post->post_modified_gmt,
            'parent'         => $post->post_parent,
            'menu_order'     => $post->menu_order,
            'featured_image' => get_post_thumbnail_id( $post->ID ) ?: null,
            'permalink'      => get_permalink( $post->ID ),
        ];
    }

    /**
     * Get available post types.
     *
     * @return array<string>
     */
    protected function get_available_post_types(): array {
        $types = get_post_types( [ 'public' => true ], 'names' );
        
        // Exclude attachments.
        unset( $types['attachment'] );
        
        return array_values( $types );
    }
}
