<?php

declare(strict_types=1);

namespace WordForge\Abilities\Styles;

use WordForge\Abilities\AbstractAbility;

class GetGlobalStyles extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-styles';
    }

    protected function is_read_only(): bool {
        return true;
    }

    public function get_title(): string {
        return __( 'Get Global Styles', 'wordforge' );
    }

    public function get_description(): string {
        return __(
            'Retrieve global styles configuration (theme.json) for the site including color palettes, typography settings, spacing presets, and ' .
            'applied styles. Full Site Editing (FSE) themes use this to control site-wide design. Can fetch all settings or specific sections ' .
            '(settings, styles, custom templates). Use this to view current design system before making style changes.',
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
                'section' => [
                    'type'        => 'string',
                    'description' => 'Specific section to retrieve.',
                    'enum'        => [ 'all', 'settings', 'styles', 'customTemplates', 'templateParts' ],
                    'default'     => 'all',
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $global_styles_id = $this->get_global_styles_post_id();

        if ( ! $global_styles_id ) {
            $theme_json = \WP_Theme_JSON_Resolver::get_merged_data();
            return $this->success( $theme_json->get_raw_data() );
        }

        $section = $args['section'] ?? 'all';
        $theme_json = \WP_Theme_JSON_Resolver::get_merged_data();
        $data = $theme_json->get_raw_data();

        if ( 'all' !== $section && isset( $data[ $section ] ) ) {
            return $this->success( [ $section => $data[ $section ] ] );
        }

        return $this->success( $data );
    }

    private function get_global_styles_post_id(): ?int {
        $global_styles = get_posts( [
            'post_type'      => 'wp_global_styles',
            'posts_per_page' => 1,
            'post_status'    => 'publish',
        ] );

        return ! empty( $global_styles ) ? $global_styles[0]->ID : null;
    }
}
