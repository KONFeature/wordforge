<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Styles;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\CacheableTrait;

class GetGlobalStyles extends AbstractAbility {

	use CacheableTrait;

	private const CACHE_KEY = 'global_styles';
	private const CACHE_TTL = 600;

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

	public function get_output_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'                 => 'object',
					'description'          => 'Global styles configuration (theme.json format)',
					'additionalProperties' => true,
				],
			],
			'required' => [ 'success', 'data' ],
		];
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
		$section = $args['section'] ?? 'all';

		return $this->cached_success(
			self::CACHE_KEY,
			fn() => $this->fetch_styles( $section ),
			self::CACHE_TTL,
			[ 'section' => $section ]
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fetch_styles( string $section ): array {
		$theme_json = \WP_Theme_JSON_Resolver::get_merged_data();
		$data = $theme_json->get_raw_data();

		if ( 'all' !== $section && isset( $data[ $section ] ) ) {
			return [ $section => $data[ $section ] ];
		}

		return $data;
	}
}
