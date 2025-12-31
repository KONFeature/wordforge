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
     * Get the output schema for the ability.
     * Override in subclasses for specific output schemas.
     *
     * @return array<string, mixed>
     */
    public function get_output_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'success' => [
                    'type'        => 'boolean',
                    'description' => 'Whether the operation succeeded.',
                ],
                'data' => [
                    'type'        => 'object',
                    'description' => 'The response data.',
                ],
                'message' => [
                    'type'        => 'string',
                    'description' => 'Optional message about the operation.',
                ],
                'error' => [
                    'type'        => 'object',
                    'description' => 'Error details if success is false.',
                    'properties'  => [
                        'code'    => [ 'type' => 'string' ],
                        'message' => [ 'type' => 'string' ],
                    ],
                ],
            ],
            'required' => [ 'success' ],
        ];
    }

    /**
     * Execute the ability.
     *
     * @param array<string, mixed> $args The input arguments.
     * @return array<string, mixed> The result.
     */
    abstract public function execute( array $args ): array;

    /**
     * Get the category slug for this ability.
     * Override in subclasses to set specific categories.
     *
     * @return string
     */
    public function get_category(): string {
        return 'wordforge-content';
    }

    /**
     * Get the capabilities required to use this ability.
     * Returns a single capability or an array (user must have at least one).
     *
     * @return string|array<string>
     */
    public function get_capability(): string|array {
        return 'edit_posts';
    }

    /**
     * Check if the current user has permission to use this ability.
     * For array capabilities, user must have at least one.
     *
     * @return bool
     */
    public function check_permission(): bool {
        $capabilities = $this->get_capability();

        if ( is_array( $capabilities ) ) {
            foreach ( $capabilities as $cap ) {
                if ( current_user_can( $cap ) ) {
                    return true;
                }
            }
            return false;
        }

        return current_user_can( $capabilities );
    }

    /**
     * Register the ability with WordPress.
     *
     * @param string $name The ability name (e.g., 'wordforge/list-content').
     * @return void
     */
    public function register( string $name ): void {
        if ( ! function_exists( 'wp_register_ability' ) ) {
            return;
        }

        // All abilities register as tools for uniform discoverability and execution.
        // The readOnlyHint annotation indicates safe/idempotent operations.
		$meta = [
			'show_in_rest' => true,
			'mcp'          => [
				'public' => true,
				'type'   => 'tool',
			],
			'annotations'  => [
				'readonly'    => $this->is_read_only(),
				'destructive' => $this->is_destructive(),
				'idempotent'  => $this->is_idempotent(),
			],
		];

        wp_register_ability(
            $name,
            [
                'label'               => $this->get_title(),
                'description'         => $this->get_description(),
                'category'            => $this->get_category(),
                'input_schema'        => $this->get_input_schema(),
                'output_schema'       => $this->get_output_schema(),
                'permission_callback' => [ $this, 'check_permission' ],
                'execute_callback'    => [ $this, 'execute' ],
                'meta'                => $meta,
            ]
        );
    }

    /**
     * Whether this ability only reads data (doesn't modify state).
     * Override in subclasses. Read-only abilities are exposed as MCP resources.
     *
     * @return bool
     */
    protected function is_read_only(): bool {
        return false;
    }

    /**
     * Whether this ability may perform destructive operations (delete/destroy).
     * Override in subclasses.
     *
     * @return bool
     */
    protected function is_destructive(): bool {
        return false;
    }

    /**
     * Whether calling this ability repeatedly with the same args has no additional effect.
     * By default, read-only operations are considered idempotent.
     *
     * @return bool
     */
    protected function is_idempotent(): bool {
        return $this->is_read_only();
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
