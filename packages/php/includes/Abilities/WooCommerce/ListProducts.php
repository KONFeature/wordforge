<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListProducts extends AbstractAbility {

	use PaginationSchemaTrait;

	public function get_category(): string {
		return 'wordforge-woocommerce';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'List Products', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Search and browse WooCommerce products with filtering by type, status, category, tag, SKU, or sale status. ' .
			'Returns summary data (ID, name, price, stock, short_description) to keep responses lightweight. ' .
			'IMPORTANT: To get full product details including long description, use wordforge/get-product with the ID from this list.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_products';
	}

	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			$this->get_product_item_schema(),
			'Array of products.'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
				'status'   => array(
					'type'        => 'string',
					'description' => 'publish=live, draft=hidden, pending=review, private=admin-only.',
					'enum'        => array( 'publish', 'draft', 'pending', 'private', 'trash', 'any' ),
					'default'     => 'any',
				),
				'type'     => array(
					'type'        => 'string',
					'description' => 'simple=standard, variable=has variations, grouped=bundle, external=affiliate.',
					'enum'        => array( 'simple', 'variable', 'grouped', 'external', 'any' ),
					'default'     => 'any',
				),
					'category' => array(
						'type'        => 'string',
						'description' => 'Product category slug.',
					),
					'tag'      => array(
						'type'        => 'string',
						'description' => 'Product tag slug.',
					),
					'sku'      => array(
						'type'        => 'string',
						'description' => 'Filter by SKU.',
					),
					'featured' => array(
						'type' => 'boolean',
					),
					'on_sale'  => array(
						'type' => 'boolean',
					),
				),
				$this->get_pagination_input_schema(
					array( 'date', 'title', 'price', 'popularity', 'rating' )
				)
			),
		);
	}

	public function execute( array $args ): array {
		$pagination = $this->normalize_pagination_args( $args );

		$query_args = array(
			'status'   => $args['status'] ?? 'any',
			'limit'    => $pagination['per_page'],
			'page'     => $pagination['page'],
			'orderby'  => $pagination['orderby'],
			'order'    => $pagination['order'],
			'paginate' => true,
		);

		if ( ! empty( $args['type'] ) && 'any' !== $args['type'] ) {
			$query_args['type'] = $args['type'];
		}

		if ( ! empty( $args['category'] ) ) {
			$query_args['category'] = array( $args['category'] );
		}

		if ( ! empty( $args['tag'] ) ) {
			$query_args['tag'] = array( $args['tag'] );
		}

		if ( ! empty( $args['sku'] ) ) {
			$query_args['sku'] = $args['sku'];
		}

		if ( isset( $args['featured'] ) ) {
			$query_args['featured'] = $args['featured'];
		}

		if ( isset( $args['on_sale'] ) && $args['on_sale'] ) {
			$query_args['on_sale'] = true;
		}

		$results = wc_get_products( $query_args );

		$items = array_map( array( $this, 'format_product' ), $results->products );

		return $this->paginated_success( $items, $results->total, $results->max_num_pages, $pagination );
	}

	protected function format_product( \WC_Product $product ): array {
		$data = array(
			'id'                => $product->get_id(),
			'name'              => $product->get_name(),
			'slug'              => $product->get_slug(),
			'type'              => $product->get_type(),
			'status'            => $product->get_status(),
			'sku'               => $product->get_sku(),
			'price'             => $product->get_price(),
			'regular_price'     => $product->get_regular_price(),
			'sale_price'        => $product->get_sale_price(),
			'on_sale'           => $product->is_on_sale(),
			'stock_status'      => $product->get_stock_status(),
			'stock_quantity'    => $product->get_stock_quantity(),
			'featured'          => $product->is_featured(),
			'short_description' => $product->get_short_description(),
			'categories'        => $this->get_term_names( $product, 'product_cat' ),
			'tags'              => $this->get_term_names( $product, 'product_tag' ),
			'permalink'         => $product->get_permalink(),
		);

		$image_id = $product->get_image_id();
		if ( $image_id ) {
			$data['image'] = wp_get_attachment_url( $image_id );
		}

		return $data;
	}

	private function get_term_names( \WC_Product $product, string $taxonomy ): array {
		$terms = get_the_terms( $product->get_id(), $taxonomy );
		if ( ! $terms || is_wp_error( $terms ) ) {
			return array();
		}
		return array_map( fn( $term ) => $term->name, $terms );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_product_item_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'                => array( 'type' => 'integer' ),
				'name'              => array( 'type' => 'string' ),
				'slug'              => array( 'type' => 'string' ),
				'type'              => array( 'type' => 'string' ),
				'status'            => array( 'type' => 'string' ),
				'sku'               => array( 'type' => 'string' ),
				'price'             => array( 'type' => 'string' ),
				'regular_price'     => array( 'type' => 'string' ),
				'sale_price'        => array( 'type' => 'string' ),
				'on_sale'           => array( 'type' => 'boolean' ),
				'stock_status'      => array( 'type' => 'string' ),
				'stock_quantity'    => array( 'type' => 'integer' ),
				'featured'          => array( 'type' => 'boolean' ),
				'short_description' => array( 'type' => 'string' ),
				'categories'        => array(
					'type'  => 'array',
					'items' => array( 'type' => 'string' ),
				),
				'tags'              => array(
					'type'  => 'array',
					'items' => array( 'type' => 'string' ),
				),
				'image'             => array( 'type' => 'string' ),
				'permalink'         => array( 'type' => 'string' ),
			),
		);
	}
}
