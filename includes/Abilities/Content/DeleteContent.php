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
        return __( 'Delete (trash or permanently remove) a post, page, or custom post type.', 'wordforge' );
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
                    'description' => 'The post ID to delete.',
                ],
                'force' => [
                    'type'        => 'boolean',
                    'description' => 'Permanently delete instead of moving to trash.',
                    'default'     => false,
                ],
            ],
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
