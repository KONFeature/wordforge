<?php

declare(strict_types=1);

namespace WordForge\Abilities\Styles;

use WordForge\Abilities\AbstractAbility;

class UpdateBlockStyles extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-styles';
    }

    public function get_title(): string {
        return __( 'Update Block Styles', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Register or update custom block styles.', 'wordforge' );
    }

    public function get_capability(): string {
        return 'edit_theme_options';
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'required'   => [ 'block_type', 'style' ],
            'properties' => [
                'block_type' => [
                    'type'        => 'string',
                    'description' => 'Block type to add style to (e.g., core/button).',
                ],
                'style' => [
                    'type'        => 'object',
                    'description' => 'Style definition.',
                    'required'    => [ 'name' ],
                    'properties'  => [
                        'name'         => [ 'type' => 'string', 'description' => 'Unique style name.' ],
                        'label'        => [ 'type' => 'string', 'description' => 'Display label.' ],
                        'inline_style' => [ 'type' => 'string', 'description' => 'CSS to apply.' ],
                        'is_default'   => [ 'type' => 'boolean', 'description' => 'Set as default style.' ],
                    ],
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $block_type = $args['block_type'];
        $style = $args['style'];

        if ( empty( $style['name'] ) ) {
            return $this->error( 'Style name is required.', 'missing_name' );
        }

        $style_args = [
            'name'  => sanitize_key( $style['name'] ),
            'label' => $style['label'] ?? $style['name'],
        ];

        if ( isset( $style['inline_style'] ) ) {
            $style_args['inline_style'] = wp_strip_all_tags( $style['inline_style'] );
        }

        if ( isset( $style['is_default'] ) ) {
            $style_args['is_default'] = (bool) $style['is_default'];
        }

        $registered = register_block_style( $block_type, $style_args );

        if ( ! $registered ) {
            return $this->error( 'Failed to register block style.', 'registration_failed' );
        }

        $this->persist_custom_style( $block_type, $style_args );

        return $this->success( [
            'block_type' => $block_type,
            'style'      => $style_args,
        ], 'Block style registered successfully.' );
    }

    private function persist_custom_style( string $block_type, array $style ): void {
        $custom_styles = get_option( 'wordforge_custom_block_styles', [] );

        if ( ! isset( $custom_styles[ $block_type ] ) ) {
            $custom_styles[ $block_type ] = [];
        }

        $custom_styles[ $block_type ][ $style['name'] ] = $style;

        update_option( 'wordforge_custom_block_styles', $custom_styles );
    }
}
