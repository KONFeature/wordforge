<?php

declare(strict_types=1);

namespace WordForge\Abilities\Blocks;

use WordForge\Abilities\AbstractAbility;

class GetPageBlocks extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-blocks';
    }

    public function get_title(): string {
        return __( 'Get Page Blocks', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Get the Gutenberg blocks structure of a page or post.', 'wordforge' );
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'required'   => [ 'id' ],
            'properties' => [
                'id' => [
                    'type'        => 'integer',
                    'description' => 'The post/page ID.',
                ],
                'parse_mode' => [
                    'type'        => 'string',
                    'description' => 'How to parse blocks.',
                    'enum'        => [ 'full', 'simplified' ],
                    'default'     => 'full',
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
            return $this->error( 'You do not have permission to view this content.', 'forbidden' );
        }

        $blocks = parse_blocks( $post->post_content );
        $parse_mode = $args['parse_mode'] ?? 'full';

        if ( 'simplified' === $parse_mode ) {
            $blocks = $this->simplify_blocks( $blocks );
        }

        return $this->success( [
            'id'     => $post_id,
            'title'  => $post->post_title,
            'blocks' => $blocks,
        ] );
    }

    private function simplify_blocks( array $blocks ): array {
        return array_map( function ( $block ) {
            $simplified = [
                'name'  => $block['blockName'],
                'attrs' => $block['attrs'] ?? [],
            ];

            if ( ! empty( $block['innerBlocks'] ) ) {
                $simplified['innerBlocks'] = $this->simplify_blocks( $block['innerBlocks'] );
            }

            if ( ! empty( $block['innerHTML'] ) && null === $block['blockName'] ) {
                $simplified['html'] = trim( $block['innerHTML'] );
            }

            return $simplified;
        }, array_filter( $blocks, fn( $b ) => ! empty( $b['blockName'] ) || ! empty( trim( $b['innerHTML'] ?? '' ) ) ) );
    }
}
