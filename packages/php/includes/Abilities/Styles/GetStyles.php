<?php
/**
 * Get Styles Ability - Retrieve global styles or block style variations.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Styles;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\CacheableTrait;

class GetStyles extends AbstractAbility {

	use CacheableTrait;

	private const CACHE_TTL = 600;

	public function get_category(): string {
		return 'wordforge-styles';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Styles', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve theme styling configuration. Use type "global" for theme.json settings (colors, typography, spacing) or ' .
			'"block" for registered block style variations (e.g., outlined buttons). Global styles control site-wide design; ' .
			'block styles are alternative visual presets for specific blocks. Requires FSE theme for global styles.',
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
					'description'          => 'Style configuration data',
					'additionalProperties' => true,
				),
			),
			'required'   => array( 'success', 'data' ),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'type'       => array(
					'type'        => 'string',
					'description' => 'Type of styles to retrieve.',
					'enum'        => array( 'global', 'block' ),
					'default'     => 'global',
				),
				'section'    => array(
					'type'        => 'string',
					'description' => 'For global styles: specific section to retrieve.',
					'enum'        => array( 'all', 'settings', 'styles', 'customTemplates', 'templateParts' ),
					'default'     => 'all',
				),
				'block_type' => array(
					'type'        => 'string',
					'description' => 'For block styles: filter by block type (e.g., "core/button").',
				),
			),
		);
	}

	public function execute( array $args ): array {
		$type = $args['type'] ?? 'global';

		if ( 'block' === $type ) {
			return $this->get_block_styles( $args['block_type'] ?? null );
		}

		return $this->get_global_styles( $args['section'] ?? 'all' );
	}

	/**
	 * Fetch global styles (theme.json).
	 *
	 * @param string $section Section to retrieve.
	 * @return array<string, mixed>
	 */
	private function get_global_styles( string $section ): array {
		return $this->cached_success(
			'global_styles',
			function () use ( $section ) {
				$theme_json = \WP_Theme_JSON_Resolver::get_merged_data();
				$data       = $theme_json->get_raw_data();

				if ( 'all' !== $section && isset( $data[ $section ] ) ) {
					return array(
						'type'    => 'global',
						'section' => $section,
						'data'    => $data[ $section ],
					);
				}

				return array(
					'type' => 'global',
					'data' => $data,
				);
			},
			self::CACHE_TTL,
			array( 'section' => $section )
		);
	}

	/**
	 * Fetch block style variations.
	 *
	 * @param string|null $block_type Optional block type filter.
	 * @return array<string, mixed>
	 */
	private function get_block_styles( ?string $block_type ): array {
		return $this->cached_success(
			'block_styles',
			function () use ( $block_type ) {
				$registry = \WP_Block_Styles_Registry::get_instance();

				if ( $block_type ) {
					$styles = $registry->get_registered_styles_for_block( $block_type );
					return array(
						'type'       => 'block',
						'block_type' => $block_type,
						'styles'     => $styles,
					);
				}

				$all_styles = $registry->get_all_registered();
				$formatted  = array();

				foreach ( $all_styles as $type => $styles ) {
					$formatted[ $type ] = array_map(
						fn( $style ) => array(
							'name'         => $style['name'],
							'label'        => $style['label'] ?? $style['name'],
							'is_default'   => $style['is_default'] ?? false,
							'inline_style' => $style['inline_style'] ?? null,
							'style_handle' => $style['style_handle'] ?? null,
						),
						$styles
					);
				}

				return array(
					'type'   => 'block',
					'styles' => $formatted,
				);
			},
			self::CACHE_TTL,
			array( 'block_type' => $block_type )
		);
	}
}
