<?php
/**
 * List Block Types Ability - Discover registered Gutenberg blocks.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Blocks;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;
use WordForge\Abilities\Traits\CacheableTrait;

/**
 * List registered Gutenberg block types with pagination and filtering.
 */
class ListBlockTypes extends AbstractAbility {

	use PaginationSchemaTrait;
	use CacheableTrait;

	/**
	 * Get the category slug for this ability.
	 *
	 * @return string
	 */
	public function get_category(): string {
		return 'wordforge-blocks';
	}

	/**
	 * Whether this ability only reads data.
	 *
	 * @return bool
	 */
	protected function is_read_only(): bool {
		return true;
	}

	/**
	 * Get the ability title.
	 *
	 * @return string
	 */
	public function get_title(): string {
		return __( 'List Block Types', 'wordforge' );
	}

	/**
	 * Get the ability description.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __( 'List registered Gutenberg block types. Provide "name" to get single block details. MODES: simplified or full.', 'wordforge' );
	}

	/**
	 * Get the capabilities required.
	 *
	 * @return string|array<string>
	 */
	public function get_capability(): string|array {
		return array( 'edit_posts', 'edit_theme_options' );
	}

	/**
	 * Get the output schema.
	 *
	 * @return array<string, mixed>
	 */
	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			array(
				'type'       => 'object',
				'properties' => array(
					'name'        => array( 'type' => 'string' ),
					'title'       => array( 'type' => 'string' ),
					'category'    => array( 'type' => 'string' ),
					'description' => array( 'type' => 'string' ),
					'icon'        => array( 'type' => 'string' ),
					'keywords'    => array( 'type' => 'array' ),
					'supports'    => array( 'type' => 'object' ),
					'attributes'  => array( 'type' => 'object' ),
					'styles'      => array( 'type' => 'array' ),
					'variations'  => array( 'type' => 'array' ),
					'parent'      => array( 'type' => 'array' ),
					'ancestor'    => array( 'type' => 'array' ),
				),
			),
			'Block types.'
		);
	}

	/**
	 * Get the input schema.
	 *
	 * @return array<string, mixed>
	 */
	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
					'name'     => array(
						'type'        => 'string',
						'description' => 'Block type name (e.g., "core/paragraph"). If provided, returns single block with full details.',
						'pattern'     => '^[a-z0-9-]+/[a-z0-9-]+$',
					),
					'category' => array(
						'type'        => 'string',
						'description' => 'Filter by category: text, media, design, widgets, theme, embed, or plugin-specific.',
					),
					'search'   => array(
						'type'        => 'string',
						'description' => 'Search in block name, title, description, keywords.',
						'minLength'   => 1,
						'maxLength'   => 100,
					),
					'mode'     => array(
						'type'        => 'string',
						'description' => 'simplified=compact (name, title, category, description), full=complete data.',
						'enum'        => array( 'simplified', 'full' ),
						'default'     => 'simplified',
					),
				),
				$this->get_pagination_input_schema(
					array( 'name', 'title', 'category' ),
					100,
					20
				)
			),
		);
	}

	/**
	 * Execute the ability.
	 *
	 * @param array<string, mixed> $args The input arguments.
	 * @return array<string, mixed>
	 */
	public function execute( array $args ): array {
		if ( ! empty( $args['name'] ) ) {
			return $this->get_single_block_type( $args['name'], $args['mode'] ?? 'full' );
		}

		return $this->cached_success(
			'list_block_types',
			fn() => $this->fetch_block_types( $args ),
			300,
			$args
		);
	}

	/**
	 * Get a single block type by name.
	 *
	 * @param string $name Block type name.
	 * @param string $mode Output mode (simplified or full).
	 * @return array<string, mixed>
	 */
	private function get_single_block_type( string $name, string $mode ): array {
		$registry   = \WP_Block_Type_Registry::get_instance();
		$block_type = $registry->get_registered( $name );

		if ( ! $block_type ) {
			return $this->error(
				sprintf( 'Block type "%s" not found.', $name ),
				'not_found'
			);
		}

		$formatted = 'simplified' === $mode
			? $this->format_simplified( $block_type )
			: $this->format_full( $block_type );

		return $this->paginated_success(
			array( $formatted ),
			1,
			1,
			array(
				'page'     => 1,
				'per_page' => 1,
			)
		);
	}

	/**
	 * Fetch block types with filtering and pagination.
	 *
	 * @param array<string, mixed> $args Input arguments.
	 * @return array<string, mixed>
	 */
	private function fetch_block_types( array $args ): array {
		$registry   = \WP_Block_Type_Registry::get_instance();
		$all_blocks = $registry->get_all_registered();
		$mode       = $args['mode'] ?? 'simplified';
		$category   = $args['category'] ?? null;
		$search     = $args['search'] ?? null;
		$pagination = $this->normalize_pagination_args( $args, 100, 20, 'name', 'asc' );

		$filtered = array_filter(
			$all_blocks,
			function ( $block ) use ( $category, $search ) {
				if ( $category && ( $block->category ?? '' ) !== $category ) {
					return false;
				}

				if ( $search ) {
					$searchable = strtolower(
						implode(
							' ',
							array_filter(
								array(
									$block->name ?? '',
									$block->title ?? '',
									$block->description ?? '',
									implode( ' ', $block->keywords ?? array() ),
								)
							)
						)
					);

					if ( false === strpos( $searchable, strtolower( $search ) ) ) {
						return false;
					}
				}

				return true;
			}
		);

		$filtered = array_values( $filtered );
		usort(
			$filtered,
			function ( $a, $b ) use ( $pagination ) {
				$field = $pagination['orderby'];
				$val_a = $a->$field ?? $a->name ?? '';
				$val_b = $b->$field ?? $b->name ?? '';
				$cmp   = strcasecmp( $val_a, $val_b );
				return 'DESC' === $pagination['order'] ? -$cmp : $cmp;
			}
		);

		$total       = count( $filtered );
		$total_pages = (int) ceil( $total / $pagination['per_page'] );
		$offset      = ( $pagination['page'] - 1 ) * $pagination['per_page'];
		$paged       = array_slice( $filtered, $offset, $pagination['per_page'] );

		$items = 'full' === $mode
			? array_map( array( $this, 'format_full' ), $paged )
			: array_map( array( $this, 'format_simplified' ), $paged );

		return array(
			'items'      => $items,
			'total'      => $total,
			'pages'      => $total_pages,
			'pagination' => $pagination,
			'categories' => $this->get_block_categories(),
		);
	}

	/**
	 * Format a block type in simplified mode.
	 *
	 * @param \WP_Block_Type $block The block type.
	 * @return array<string, mixed>
	 */
	private function format_simplified( \WP_Block_Type $block ): array {
		$data = array(
			'name'        => $block->name,
			'title'       => $block->title ?? $block->name,
			'category'    => $block->category ?? 'uncategorized',
			'description' => $block->description ?? '',
			'keywords'    => $block->keywords ?? array(),
		);

		if ( is_string( $block->icon ) ) {
			$data['icon'] = $block->icon;
		}

		return $data;
	}

	/**
	 * Format a block type in full mode.
	 *
	 * @param \WP_Block_Type $block The block type.
	 * @return array<string, mixed>
	 */
	private function format_full( \WP_Block_Type $block ): array {
		$data = $this->format_simplified( $block );

		$data['supports']         = $block->supports ?? array();
		$data['attributes']       = $block->attributes ?? array();
		$data['styles']           = $block->styles ?? array();
		$data['variations']       = $this->format_variations( $block->variations ?? array() );
		$data['parent']           = $block->parent ?? array();
		$data['ancestor']         = $block->ancestor ?? array();
		$data['example']          = $block->example ?? null;
		$data['provides_context'] = $block->provides_context ?? array();
		$data['uses_context']     = $block->uses_context ?? array();

		return $data;
	}

	/**
	 * Format block variations.
	 *
	 * @param array<mixed> $variations Raw variations.
	 * @return array<array<string, mixed>>
	 */
	private function format_variations( array $variations ): array {
		return array_map(
			function ( $v ) {
				$data = array(
					'name'        => $v['name'] ?? '',
					'title'       => $v['title'] ?? '',
					'description' => $v['description'] ?? '',
					'isDefault'   => $v['isDefault'] ?? false,
				);

				if ( is_string( $v['icon'] ?? null ) ) {
					$data['icon'] = $v['icon'];
				}

				return $data;
			},
			$variations
		);
	}

	/**
	 * Get registered block categories.
	 *
	 * @return array<array{slug: string, title: string}>
	 */
	private function get_block_categories(): array {
		$post       = get_post( 0 );
		$categories = get_block_categories( $post ?? new \WP_Post( (object) array() ) );

		return array_map(
			fn( $cat ) => array(
				'slug'  => $cat['slug'],
				'title' => $cat['title'],
			),
			$categories
		);
	}

	/**
	 * Override success to handle paginated data with categories.
	 *
	 * @param mixed  $data    The response data.
	 * @param string $message Optional success message.
	 * @return array<string, mixed>
	 */
	protected function success( mixed $data, string $message = '' ): array {
		if ( is_array( $data ) && isset( $data['items'], $data['pagination'] ) ) {
			$response = $this->paginated_success(
				$data['items'],
				$data['total'],
				$data['pages'],
				$data['pagination']
			);

			if ( isset( $data['categories'] ) ) {
				$response['data']['categories'] = $data['categories'];
			}

			return $response;
		}

		return parent::success( $data, $message );
	}
}
