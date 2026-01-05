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
	 * @param array<int|string, string> $orderby_options Available orderby values as simple or associative array.
	 * @param int                       $max_per_page    Maximum items per page (default 50).
	 * @param int                       $default_per_page Default items per page (default 10).
	 * @return array<string, array<string, mixed>>
	 */
	protected function get_pagination_input_schema(
        array $orderby_options = array(),
        int $max_per_page = 50,
        int $default_per_page = 10
    ): array {
        // Safe enum extraction (compatible with PHP 8.1+ array_is_list)
        if ( empty( $orderby_options ) ) {
            $orderby_enum = array( 'date', 'title', 'modified', 'id' );
        } elseif ( function_exists( 'array_is_list' ) && array_is_list( $orderby_options ) ) {
            $orderby_enum = array_values( $orderby_options );
        } else {
            $orderby_enum = array_keys( $orderby_options );
        }

        // Ensure all enum values are strings for Gemini compliance
        $orderby_enum = array_map( 'strval', $orderby_enum );

        return array(
            'per_page' => array(
                'type'        => 'integer',
                // Optimized: Short & precise. 
                'description' => "Limit items (1-$max_per_page). Default $default_per_page.",
                'default'     => $default_per_page,
                'minimum'     => 1,
                'maximum'     => $max_per_page,
            ),
            'page'     => array(
                'type'        => 'integer',
                'description' => 'Page number.',
                'default'     => 1,
                'minimum'     => 1,
            ),
            'orderby'  => array(
                'type'        => 'string',
                'description' => 'Sort field.',
                'enum'        => $orderby_enum,
                'default'     => $orderby_enum[0] ?? 'date',
            ),
            'order'    => array(
                'type'        => 'string',
                'description' => 'Sort direction.',
                'enum'        => array( 'asc', 'desc' ),
                'default'     => 'desc',
            ),
        );
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
        string $items_description = 'Result list.'
    ): array {
        return array(
            'type'       => 'object',
            'properties' => array(
                'success' => array( 'type' => 'boolean' ),
                'data'    => array(
                    'type'       => 'object',
                    'properties' => array(
                        'items'       => array(
                            'type'        => 'array',
                            'description' => $items_description,
                            'items'       => $item_schema,
                        ),
                        'total'       => array( 'type' => 'integer', 'description' => 'Total count.' ),
                        'total_pages' => array( 'type' => 'integer', 'description' => 'Total pages.' ),
                        'page'        => array( 'type' => 'integer', 'description' => 'Current page.' ),
                        'per_page'    => array( 'type' => 'integer', 'description' => 'Limit.' ),
                    ),
                    'required'   => array( 'items', 'total', 'total_pages', 'page', 'per_page' ),
                ),
            ),
            'required'   => array( 'success', 'data' ),
		);
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
		return array(
			'per_page' => min( (int) ( $args['per_page'] ?? $default_per_page ), $max_per_page ),
			'page'     => max( (int) ( $args['page'] ?? 1 ), 1 ),
			'orderby'  => $args['orderby'] ?? $default_orderby,
			'order'    => strtoupper( $args['order'] ?? $default_order ),
		);
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
		return $this->success(
			array(
				'items'       => $items,
				'total'       => $total,
				'total_pages' => $total_pages,
				'page'        => $pagination['page'],
				'per_page'    => $pagination['per_page'],
			)
		);
	}
}
