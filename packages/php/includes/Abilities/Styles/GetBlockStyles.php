<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Styles;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\CacheableTrait;

class GetBlockStyles extends AbstractAbility {

	use CacheableTrait;

	private const CACHE_KEY = 'block_styles';
	private const CACHE_TTL = 600;

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

	public function get_output_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'                 => 'object',
					'description'          => 'Block styles by block type',
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
				'block_type' => [
					'type'        => 'string',
					'description' => 'Filter by block type (e.g., core/button).',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$block_type = $args['block_type'] ?? null;

		return $this->cached_success(
			self::CACHE_KEY,
			fn() => $this->fetch_block_styles( $block_type ),
			self::CACHE_TTL,
			[ 'block_type' => $block_type ]
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fetch_block_styles( ?string $block_type ): array {
		$registry = \WP_Block_Styles_Registry::get_instance();

		if ( $block_type ) {
			$styles = $registry->get_registered_styles_for_block( $block_type );
			return [
				'block_type' => $block_type,
				'styles'     => $styles,
			];
		}

		$all_styles = $registry->get_all_registered();
		$formatted = [];

		foreach ( $all_styles as $type => $styles ) {
			$formatted[ $type ] = array_map( fn( $style ) => [
				'name'         => $style['name'],
				'label'        => $style['label'] ?? $style['name'],
				'is_default'   => $style['is_default'] ?? false,
				'inline_style' => $style['inline_style'] ?? null,
				'style_handle' => $style['style_handle'] ?? null,
			], $styles );
		}

		return $formatted;
	}
}
