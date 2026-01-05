<?php

declare(strict_types=1);

namespace WordForge\Abilities\Styles;

use WordForge\Abilities\AbstractAbility;

class UpdateGlobalStyles extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-styles';
	}

	public function get_title(): string {
		return __( 'Update Global Styles', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Update global styles configuration (theme.json) to modify site-wide design including color palettes, typography, spacing, and element ' .
			'styles. Supports merging with existing styles (default) or complete replacement. Changes affect entire site immediately. Use this to ' .
			'customize FSE theme appearance, update color schemes, modify typography scales, or adjust spacing presets. Requires Full Site Editing support.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_theme_options';
	}

	public function get_output_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'                 => 'object',
					'description'          => 'Updated global styles configuration',
					'additionalProperties' => true,
				),
				'message' => array( 'type' => 'string' ),
			),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'settings' => array(
					'type'        => 'object',
					'description' => 'Theme settings (color palette, typography, spacing presets).',
				),
				'styles'   => array(
					'type'        => 'object',
					'description' => 'Style values (colors, typography, spacing applied to elements).',
				),
				'merge'    => array(
					'type'        => 'boolean',
					'description' => 'Merge with existing styles instead of replacing.',
					'default'     => true,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$global_styles_id = $this->get_or_create_global_styles_post();

		if ( ! $global_styles_id ) {
			return $this->error( 'Failed to access global styles.', 'access_failed' );
		}

		$current_post   = get_post( $global_styles_id );
		$current_config = json_decode( $current_post->post_content, true ) ?: array();

		$merge = $args['merge'] ?? true;

		if ( isset( $args['settings'] ) ) {
			if ( $merge && isset( $current_config['settings'] ) ) {
				$current_config['settings'] = array_replace_recursive(
					$current_config['settings'],
					$args['settings']
				);
			} else {
				$current_config['settings'] = $args['settings'];
			}
		}

		if ( isset( $args['styles'] ) ) {
			if ( $merge && isset( $current_config['styles'] ) ) {
				$current_config['styles'] = array_replace_recursive(
					$current_config['styles'],
					$args['styles']
				);
			} else {
				$current_config['styles'] = $args['styles'];
			}
		}

		$current_config['version'] = 3;

		$result = wp_update_post(
			array(
				'ID'           => $global_styles_id,
				'post_content' => wp_json_encode( $current_config ),
			),
			true
		);

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'update_failed' );
		}

		delete_transient( 'global_styles' );
		delete_transient( 'global_styles_' . get_stylesheet() );

		return $this->success( $current_config, 'Global styles updated successfully.' );
	}

	private function get_or_create_global_styles_post(): ?int {
		$global_styles = get_posts(
			array(
				'post_type'      => 'wp_global_styles',
				'posts_per_page' => 1,
				'post_status'    => array( 'publish', 'draft' ),
			)
		);

		if ( ! empty( $global_styles ) ) {
			return $global_styles[0]->ID;
		}

		$post_id = wp_insert_post(
			array(
				'post_type'    => 'wp_global_styles',
				'post_status'  => 'publish',
				'post_title'   => 'Custom Styles',
				'post_name'    => 'wp-global-styles-' . get_stylesheet(),
				'post_content' => wp_json_encode( array( 'version' => 3 ) ),
			)
		);

		return is_wp_error( $post_id ) ? null : $post_id;
	}
}
