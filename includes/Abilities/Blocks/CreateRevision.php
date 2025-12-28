<?php

declare(strict_types=1);

namespace WordForge\Abilities\Blocks;

use WordForge\Abilities\AbstractAbility;

class CreateRevision extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-blocks';
    }

    public function get_title(): string {
        return __( 'Create Revision', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Create a revision/draft variant of a page or post for testing changes.', 'wordforge' );
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'required'   => [ 'id' ],
            'properties' => [
                'id' => [
                    'type'        => 'integer',
                    'description' => 'The post/page ID to create a revision of.',
                ],
                'changes' => [
                    'type'        => 'object',
                    'description' => 'Optional changes to apply to the revision.',
                    'properties'  => [
                        'title'   => [ 'type' => 'string' ],
                        'content' => [ 'type' => 'string' ],
                        'blocks'  => [ 'type' => 'array' ],
                    ],
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $post_id = (int) $args['id'];
        $post = get_post( $post_id );

        if ( ! $post ) {
            return $this->error( 'Content not found.', 'not_found' );
        }

        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return $this->error( 'You do not have permission to edit this content.', 'forbidden' );
        }

        if ( ! wp_revisions_enabled( $post ) ) {
            return $this->error( 'Revisions are not enabled for this post type.', 'revisions_disabled' );
        }

        $changes = $args['changes'] ?? [];

        if ( ! empty( $changes ) ) {
            $update_data = [ 'ID' => $post_id ];

            if ( isset( $changes['title'] ) ) {
                $update_data['post_title'] = sanitize_text_field( $changes['title'] );
            }

            if ( isset( $changes['content'] ) ) {
                $update_data['post_content'] = wp_kses_post( $changes['content'] );
            }

            if ( isset( $changes['blocks'] ) ) {
                $update_data['post_content'] = $this->blocks_to_content( $changes['blocks'] );
            }

            wp_update_post( $update_data );
        }

        $revision_id = wp_save_post_revision( $post_id );

        if ( ! $revision_id ) {
            return $this->error( 'Failed to create revision.', 'revision_failed' );
        }

        $revision = get_post( $revision_id );
        $revisions = wp_get_post_revisions( $post_id, [ 'posts_per_page' => 10 ] );

        return $this->success( [
            'revision_id'     => $revision_id,
            'parent_id'       => $post_id,
            'created_at'      => $revision->post_date,
            'total_revisions' => count( $revisions ),
        ], 'Revision created successfully.' );
    }

    private function blocks_to_content( array $blocks ): string {
        $content = '';
        foreach ( $blocks as $block ) {
            $content .= serialize_block( $block );
        }
        return $content;
    }
}
