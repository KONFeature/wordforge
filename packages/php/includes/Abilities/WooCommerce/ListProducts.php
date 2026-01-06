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
		return __( 'Products', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Get a single product by ID or SKU (full details with variations) or list products with filtering. ' .
			'USE: View product details, browse catalog, find by SKU. ' .
			'NOT FOR: Editing products (use save-product).',
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
					'id'                 => array(
						'type'        => 'integer',
						'description' => 'Product ID. When provided, returns full details for that single product. Omit to list products.',
					),
					'sku'                => array(
						'type'        => 'string',
						'description' => 'Product SKU (alternative to id for single product lookup, or for filtering list).',
					),
					'include_variations' => array(
						'type'        => 'boolean',
						'description' => 'When fetching single variable product, include all variations.',
						'default'     => false,
					),
					'status'             => array(
						'type'        => 'string',
						'description' => 'publish=live, draft=hidden, pending=review, private=admin-only.',
						'enum'        => array( 'publish', 'draft', 'pending', 'private', 'trash', 'any' ),
						'default'     => 'any',
					),
					'type'               => array(
						'type'        => 'string',
						'description' => 'simple=standard, variable=has variations, grouped=bundle, external=affiliate.',
						'enum'        => array( 'simple', 'variable', 'grouped', 'external', 'any' ),
						'default'     => 'any',
					),
					'category'           => array(
						'type'        => 'string',
						'description' => 'Product category slug.',
					),
					'tag'                => array(
						'type'        => 'string',
						'description' => 'Product tag slug.',
					),
					'featured'           => array(
						'type' => 'boolean',
					),
					'on_sale'            => array(
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
		if ( ! empty( $args['id'] ) ) {
			return $this->get_single_product( (int) $args['id'], ! empty( $args['include_variations'] ) );
		}

		if ( ! empty( $args['sku'] ) && empty( $args['status'] ) && empty( $args['type'] ) && empty( $args['category'] ) && empty( $args['tag'] ) ) {
			$product_id = wc_get_product_id_by_sku( $args['sku'] );
			if ( $product_id ) {
				return $this->get_single_product( $product_id, ! empty( $args['include_variations'] ) );
			}
			return $this->error( 'Product not found.', 'not_found' );
		}

		return $this->list_products( $args );
	}

	protected function get_single_product( int $product_id, bool $include_variations ): array {
		$product = wc_get_product( $product_id );

		if ( ! $product ) {
			return $this->error( 'Product not found.', 'not_found' );
		}

		$data = $this->format_product_full( $product );

		if ( $include_variations && $product->is_type( 'variable' ) ) {
			$data['variations'] = $this->get_variations( $product );
		}

		return $this->paginated_success(
			array( $data ),
			1,
			1,
			array(
				'page'     => 1,
				'per_page' => 1,
			)
		);
	}

	protected function format_product_full( \WC_Product $product ): array {
		return array(
			'id'                => $product->get_id(),
			'name'              => $product->get_name(),
			'slug'              => $product->get_slug(),
			'type'              => $product->get_type(),
			'status'            => $product->get_status(),
			'description'       => $product->get_description(),
			'short_description' => $product->get_short_description(),
			'sku'               => $product->get_sku(),
			'price'             => $product->get_price(),
			'regular_price'     => $product->get_regular_price(),
			'sale_price'        => $product->get_sale_price(),
			'on_sale'           => $product->is_on_sale(),
			'date_on_sale_from' => $product->get_date_on_sale_from()?->format( 'Y-m-d H:i:s' ),
			'date_on_sale_to'   => $product->get_date_on_sale_to()?->format( 'Y-m-d H:i:s' ),
			'stock_status'      => $product->get_stock_status(),
			'stock_quantity'    => $product->get_stock_quantity(),
			'manage_stock'      => $product->managing_stock(),
			'backorders'        => $product->get_backorders(),
			'weight'            => $product->get_weight(),
			'dimensions'        => array(
				'length' => $product->get_length(),
				'width'  => $product->get_width(),
				'height' => $product->get_height(),
			),
			'featured'          => $product->is_featured(),
			'virtual'           => $product->is_virtual(),
			'downloadable'      => $product->is_downloadable(),
			'tax_status'        => $product->get_tax_status(),
			'tax_class'         => $product->get_tax_class(),
			'categories'        => $this->get_terms( $product, 'product_cat' ),
			'tags'              => $this->get_terms( $product, 'product_tag' ),
			'images'            => $this->get_images( $product ),
			'attributes'        => $this->get_attributes( $product ),
			'meta_data'         => $product->get_meta_data(),
			'permalink'         => $product->get_permalink(),
			'date_created'      => $product->get_date_created()?->format( 'Y-m-d H:i:s' ),
			'date_modified'     => $product->get_date_modified()?->format( 'Y-m-d H:i:s' ),
		);
	}

	protected function get_terms( \WC_Product $product, string $taxonomy ): array {
		$terms = get_the_terms( $product->get_id(), $taxonomy );
		if ( ! $terms || is_wp_error( $terms ) ) {
			return array();
		}
		return array_map(
			fn( $term ) => array(
				'id'   => $term->term_id,
				'name' => $term->name,
				'slug' => $term->slug,
			),
			$terms
		);
	}

	protected function get_images( \WC_Product $product ): array {
		$images = array();

		$main_image_id = $product->get_image_id();
		if ( $main_image_id ) {
			$images[] = array(
				'id'  => $main_image_id,
				'src' => wp_get_attachment_url( $main_image_id ),
				'alt' => get_post_meta( $main_image_id, '_wp_attachment_image_alt', true ),
			);
		}

		foreach ( $product->get_gallery_image_ids() as $image_id ) {
			$images[] = array(
				'id'  => $image_id,
				'src' => wp_get_attachment_url( $image_id ),
				'alt' => get_post_meta( $image_id, '_wp_attachment_image_alt', true ),
			);
		}

		return $images;
	}

	protected function get_attributes( \WC_Product $product ): array {
		$attributes = array();
		foreach ( $product->get_attributes() as $attribute ) {
			$attributes[] = array(
				'name'      => $attribute->get_name(),
				'options'   => $attribute->get_options(),
				'visible'   => $attribute->get_visible(),
				'variation' => $attribute->get_variation(),
			);
		}
		return $attributes;
	}

	protected function get_variations( \WC_Product $product ): array {
		$variations = array();
		$children   = $product->get_children();

		foreach ( $children as $variation_id ) {
			$variation = wc_get_product( $variation_id );
			if ( ! $variation ) {
				continue;
			}

			$variation_data = array(
				'id'             => $variation->get_id(),
				'sku'            => $variation->get_sku(),
				'price'          => $variation->get_price(),
				'regular_price'  => $variation->get_regular_price(),
				'sale_price'     => $variation->get_sale_price(),
				'stock_status'   => $variation->get_stock_status(),
				'stock_quantity' => $variation->get_stock_quantity(),
				'attributes'     => $variation->get_variation_attributes(),
			);

			$image_id = $variation->get_image_id();
			if ( $image_id ) {
				$variation_data['image'] = wp_get_attachment_url( $image_id );
			}

			$variations[] = $variation_data;
		}

		return $variations;
	}

	protected function list_products( array $args ): array {
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
