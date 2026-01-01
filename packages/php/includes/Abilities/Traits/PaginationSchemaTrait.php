<?php
/**
 * Pagination Schema Trait - Shared pagination schema for list abilities.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * Provides common pagination schema and helpers for list abilities.
 *
 * Usage:
 * - Call get_pagination_input_schema() in get_input_schema() and merge with your filters
 * - Call get_pagination_output_schema() in get_output_schema() wrapping your item schema
 * - Call normalize_pagination_args() to get safe pagination values from args
 */
trait PaginationSchemaTrait {

	/**
	 * Get common pagination input schema properties.
	 *
	 * @param array<string, string> $orderby_options Available orderby values with descriptions.
	 * @param int                   $max_per_page    Maximum items per page (default 100).
	 * @param int                   $default_per_page Default items per page (default 20).
	 * @return array<string, array<string, mixed>>
	 */
	protected function get_pagination_input_schema(
		array $orderby_options = [],
		int $max_per_page = 100,
		int $default_per_page = 20
	): array {
		$orderby_enum = empty( $orderby_options ) 
			? [ 'date', 'title', 'modified', 'id' ] 
			: array_keys( $orderby_options );

		return [
			'per_page' => [
				'type'        => 'integer',
				'description' => sprintf(
					'Number of items to return per page. Use smaller values (10-20) for quick previews, larger values (50-%d) for comprehensive lists. Maximum %d items per request.',
					$max_per_page,
					$max_per_page
				),
				'default'     => $default_per_page,
				'minimum'     => 1,
				'maximum'     => $max_per_page,
			],
			'page' => [
				'type'        => 'integer',
				'description' => 'Page number for pagination (1-indexed). Use with "total_pages" in the response to navigate through large result sets.',
				'default'     => 1,
				'minimum'     => 1,
			],
			'orderby' => [
				'type'        => 'string',
				'description' => 'Sort results by field.',
				'enum'        => $orderby_enum,
				'default'     => $orderby_enum[0] ?? 'date',
			],
			'order' => [
				'type'        => 'string',
				'description' => 'Sort direction: "desc" (descending, newest/Z first), "asc" (ascending, oldest/A first).',
				'enum'        => [ 'asc', 'desc' ],
				'default'     => 'desc',
			],
		];
	}

	/**
	 * Get pagination output schema wrapper.
	 *
	 * @param array<string, mixed> $item_schema Schema for a single item in the list.
	 * @param string               $items_description Description for the items array.
	 * @return array<string, mixed>
	 */
	protected function get_pagination_output_schema(
		array $item_schema,
		string $items_description = 'Array of items matching the query filters.'
	): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [
					'type'        => 'boolean',
					'description' => 'Whether the query executed successfully.',
				],
				'data' => [
					'type'       => 'object',
					'properties' => [
						'items' => [
							'type'        => 'array',
							'description' => $items_description,
							'items'       => $item_schema,
						],
						'total' => [
							'type'        => 'integer',
							'description' => 'Total number of items matching the query across all pages.',
						],
						'total_pages' => [
							'type'        => 'integer',
							'description' => 'Total number of pages available. If greater than "page", more results are available.',
						],
						'page' => [
							'type'        => 'integer',
							'description' => 'Current page number (1-indexed).',
						],
						'per_page' => [
							'type'        => 'integer',
							'description' => 'Number of items per page.',
						],
					],
					'required' => [ 'items', 'total', 'total_pages', 'page', 'per_page' ],
				],
			],
			'required' => [ 'success', 'data' ],
		];
	}

	/**
	 * Normalize pagination arguments with safe defaults.
	 *
	 * @param array<string, mixed> $args         Input arguments.
	 * @param int                  $max_per_page Maximum items per page.
	 * @param int                  $default_per_page Default items per page.
	 * @param string               $default_orderby Default orderby field.
	 * @param string               $default_order Default order direction.
	 * @return array{per_page: int, page: int, orderby: string, order: string}
	 */
	protected function normalize_pagination_args(
		array $args,
		int $max_per_page = 100,
		int $default_per_page = 20,
		string $default_orderby = 'date',
		string $default_order = 'desc'
	): array {
		return [
			'per_page' => min( (int) ( $args['per_page'] ?? $default_per_page ), $max_per_page ),
			'page'     => max( (int) ( $args['page'] ?? 1 ), 1 ),
			'orderby'  => $args['orderby'] ?? $default_orderby,
			'order'    => strtoupper( $args['order'] ?? $default_order ),
		];
	}

	/**
	 * Build paginated success response.
	 *
	 * @param array<mixed>         $items       Array of formatted items.
	 * @param int                  $total       Total count of items.
	 * @param int                  $total_pages Total number of pages.
	 * @param array<string, mixed> $pagination  Normalized pagination args.
	 * @return array<string, mixed>
	 */
	protected function paginated_success(
		array $items,
		int $total,
		int $total_pages,
		array $pagination
	): array {
		return $this->success( [
			'items'       => $items,
			'total'       => $total,
			'total_pages' => $total_pages,
			'page'        => $pagination['page'],
			'per_page'    => $pagination['per_page'],
		] );
	}
}
