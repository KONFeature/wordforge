<?php
/**
 * Abstract Prompt - Base class for all WordForge MCP prompts.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Prompts;

/**
 * Abstract base class for WordForge MCP prompts.
 * 
 * Prompts return structured message arrays that guide AI assistants
 * in generating content or performing analysis tasks.
 */
abstract class AbstractPrompt {

    /**
     * Get the prompt title.
     *
     * @return string
     */
    abstract public function get_title(): string;

    /**
     * Get the prompt description.
     *
     * @return string
     */
    abstract public function get_description(): string;

    /**
     * Get the input schema for the prompt arguments.
     *
     * @return array<string, mixed>
     */
    abstract public function get_input_schema(): array;

    /**
     * Get the output schema for the prompt response.
     *
     * @return array<string, mixed>
     */
    public function get_output_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'messages' => [
                    'type'        => 'array',
                    'description' => 'Array of messages for the AI conversation.',
                    'items'       => [
                        'type'       => 'object',
                        'properties' => [
                            'role'    => [ 'type' => 'string', 'enum' => [ 'user', 'assistant' ] ],
                            'content' => [
                                'type'       => 'object',
                                'properties' => [
                                    'type' => [ 'type' => 'string' ],
                                    'text' => [ 'type' => 'string' ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'required' => [ 'messages' ],
        ];
    }

    /**
     * Execute the prompt and return messages.
     *
     * @param array<string, mixed> $args The input arguments.
     * @return array<string, mixed> Must contain 'messages' key with array of messages.
     */
    abstract public function execute( array $args ): array;

    /**
     * Get the category slug for this prompt.
     *
     * @return string
     */
    public function get_category(): string {
        return 'wordforge-prompts';
    }

    /**
     * Get the capability required to use this prompt.
     *
     * @return string
     */
    public function get_capability(): string {
        return 'edit_posts';
    }

    /**
     * Check if the current user has permission to use this prompt.
     *
     * @return bool
     */
    public function check_permission(): bool {
        return current_user_can( $this->get_capability() );
    }

    /**
     * Get prompt priority (0.0 to 1.0).
     * Higher priority prompts are suggested first.
     *
     * @return float
     */
    protected function get_priority(): float {
        return 0.7;
    }

    /**
     * Get the target audience for this prompt.
     * Can be 'user', 'assistant', or both.
     *
     * @return array<string>
     */
    protected function get_audience(): array {
        return [ 'user', 'assistant' ];
    }

    /**
     * Register the prompt with WordPress.
     *
     * @param string $name The prompt name (e.g., 'wordforge/generate-content').
     * @return void
     */
    public function register( string $name ): void {
        if ( ! function_exists( 'wp_register_ability' ) ) {
            return;
        }

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
                'meta'                => [
                    'show_in_rest' => true,
                    'mcp'          => [
                        'public' => true,
                        'type'   => 'prompt',
                    ],
                    'annotations'  => [
                        'audience' => $this->get_audience(),
                        'priority' => $this->get_priority(),
                    ],
                ],
            ]
        );
    }

    /**
     * Create a user message.
     *
     * @param string $text The message text.
     * @param array<string, mixed> $annotations Optional annotations.
     * @return array<string, mixed>
     */
    protected function user_message( string $text, array $annotations = [] ): array {
        $content = [
            'type' => 'text',
            'text' => $text,
        ];

        if ( ! empty( $annotations ) ) {
            $content['annotations'] = $annotations;
        }

        return [
            'role'    => 'user',
            'content' => $content,
        ];
    }

    /**
     * Create an assistant message (for few-shot examples or prefilled responses).
     *
     * @param string $text The message text.
     * @param array<string, mixed> $annotations Optional annotations.
     * @return array<string, mixed>
     */
    protected function assistant_message( string $text, array $annotations = [] ): array {
        $content = [
            'type' => 'text',
            'text' => $text,
        ];

        if ( ! empty( $annotations ) ) {
            $content['annotations'] = $annotations;
        }

        return [
            'role'    => 'assistant',
            'content' => $content,
        ];
    }

    /**
     * Build the messages response.
     *
     * @param array<array<string, mixed>> $messages Array of messages.
     * @return array<string, mixed>
     */
    protected function messages( array $messages ): array {
        return [
            'messages' => $messages,
        ];
    }
}
