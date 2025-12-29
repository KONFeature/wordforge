<?php
/**
 * Delete Content Ability - Delete a post, page, or custom post type.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to delete content.
 */
class DeleteContent extends AbstractAbility {

    protected function is_destructive(): bool {
        return true;
    }

    /**
     * {@inheritDoc}
     */
    public function get_title(): string {
        return __( 'Delete Content', 'wordforge' );
    }

    /**
     * {@inheritDoc}
     */
    public function get_description(): string {
        return __(
            'Delete WordPress content (post, page, or custom post type). By default, content is moved to trash (soft delete) ' .
            'where it can be restored later. Use force=true for permanent deletion (cannot be undone). Permanently deleting ' .
            'content also removes all associated metadata, comments, and revisions. Use with caution, especially with force=true. ' .
            'This is a destructive operation that requires delete_posts capability.',
            'wordforge'
        );
    }

    /**
     * {@inheritDoc}
     */
    public function get_capability(): string {
        return 'delete_posts';
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
                    'description' => 'Post ID of the content to delete. Required to identify which content to remove.',
                    'minimum'     => 1,
                ],
                'force' => [
                    'type'        => 'boolean',
                    'description' => 'Permanent deletion flag. false (default) = move to trash (recoverable), true = permanently delete (cannot be undone, removes all metadata, comments, and revisions). Use true with extreme caution.',
                    'default'     => false,
                ],
            ],
        ];
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
                    'description' => 'Whether the deletion was successful.',
                ],
                'data' => [
                    'type'        => 'object',
                    'description' => 'Deletion confirmation details.',
                    'properties'  => [
                        'id' => [
                            'type'        => 'integer',
                            'description' => 'ID of the deleted content.',
                        ],
                        'deleted' => [
                            'type'        => 'boolean',
                            'description' => 'Confirmation that content was deleted (always true on success).',
                        ],
                        'force' => [
                            'type'        => 'boolean',
                            'description' => 'Whether permanent deletion was used (true) or content was trashed (false).',
                        ],
                    ],
                ],
                'message' => [
                    'type'        => 'string',
                    'description' => 'Human-readable message indicating the deletion action taken.',
                ],
            ],
            'required'   => [ 'success', 'data' ],
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function execute( array $args ): array {
        $post_id = (int) $args['id'];
        $force = (bool) ( $args['force'] ?? false );

        $post = get_post( $post_id );

        if ( ! $post ) {
            return $this->error( 'Content not found.', 'not_found' );
        }

        // Check capability.
        if ( ! current_user_can( 'delete_post', $post_id ) ) {
            return $this->error(
                'You do not have permission to delete this content.',
                'forbidden'
            );
        }

        $title = $post->post_title;
        $type = $post->post_type;

        $result = wp_delete_post( $post_id, $force );

        if ( ! $result ) {
            return $this->error( 'Failed to delete content.', 'delete_failed' );
        }

        $action = $force ? 'permanently deleted' : 'moved to trash';

        return $this->success(
            [
                'id'      => $post_id,
                'deleted' => true,
                'force'   => $force,
            ],
            sprintf( '%s "%s" %s.', ucfirst( $type ), $title, $action )
        );
    }
}
