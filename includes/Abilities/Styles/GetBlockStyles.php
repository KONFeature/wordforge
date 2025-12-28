<?php

declare(strict_types=1);

namespace WordForge\Abilities\Styles;

use WordForge\Abilities\AbstractAbility;

class GetBlockStyles extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-styles';
    }

    protected function is_read_only(): bool {
        return true;
    }

    public function get_title(): string {
        return __( 'Get Block Styles', 'wordforge' );
    }

    public function get_description(): string {
        return __(
            'Retrieve registered block style variations for Gutenberg blocks. Block styles are alternative visual designs for blocks (e.g., ' .
            '"Outlined" or "Fill" button styles). Returns style name, label, inline CSS, and default status. Can filter by specific block type. ' .
            'Use this to discover available block style variations or understand block styling options.',
            'wordforge'
        );
    }

    public function get_capability(): string {
        return 'edit_theme_options';
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'block_type' => [
                    'type'        => 'string',
                    'description' => 'Filter by block type (e.g., core/button).',
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $registry = \WP_Block_Styles_Registry::get_instance();
        $all_styles = $registry->get_all_registered();

        if ( ! empty( $args['block_type'] ) ) {
            $block_type = $args['block_type'];
            $styles = $registry->get_registered_styles_for_block( $block_type );

            return $this->success( [
                'block_type' => $block_type,
                'styles'     => $styles,
            ] );
        }

        $formatted = [];
        foreach ( $all_styles as $block_type => $styles ) {
            $formatted[ $block_type ] = array_map( fn( $style ) => [
                'name'         => $style['name'],
                'label'        => $style['label'] ?? $style['name'],
                'is_default'   => $style['is_default'] ?? false,
                'inline_style' => $style['inline_style'] ?? null,
                'style_handle' => $style['style_handle'] ?? null,
            ], $styles );
        }

        return $this->success( $formatted );
    }
}
