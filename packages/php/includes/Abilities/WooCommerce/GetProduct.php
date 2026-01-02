<?php

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;

class GetProduct extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-woocommerce';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Product', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve complete details about a specific WooCommerce product. Can fetch by product ID or SKU. Returns full product data ' .
			'including pricing, inventory, dimensions, images, categories, attributes, and metadata. For variable products, optionally ' .
			'includes all variations with their specific attributes and pricing. Use this to view product details before updates or to ' .
			'extract product information for external systems.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_products';
	}

	public function get_output_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'       => 'object',
					'properties' => array(
						'id'                => array( 'type' => 'integer' ),
						'name'              => array( 'type' => 'string' ),
						'slug'              => array( 'type' => 'string' ),
						'type'              => array( 'type' => 'string' ),
						'status'            => array( 'type' => 'string' ),
						'description'       => array( 'type' => 'string' ),
						'short_description' => array( 'type' => 'string' ),
						'sku'               => array( 'type' => 'string' ),
						'price'             => array( 'type' => 'string' ),
						'regular_price'     => array( 'type' => 'string' ),
						'sale_price'        => array( 'type' => 'string' ),
						'on_sale'           => array( 'type' => 'boolean' ),
						'stock_status'      => array( 'type' => 'string' ),
						'stock_quantity'    => array( 'type' => array( 'integer', 'null' ) ),
						'manage_stock'      => array( 'type' => 'boolean' ),
						'featured'          => array( 'type' => 'boolean' ),
						'virtual'           => array( 'type' => 'boolean' ),
						'downloadable'      => array( 'type' => 'boolean' ),
						'categories'        => array( 'type' => 'array' ),
						'tags'              => array( 'type' => 'array' ),
						'images'            => array( 'type' => 'array' ),
						'attributes'        => array( 'type' => 'array' ),
						'variations'        => array( 'type' => 'array' ),
						'permalink'         => array( 'type' => 'string' ),
					),
				),
			),
			'required'   => array( 'success', 'data' ),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'                 => array(
					'type'        => 'integer',
					'description' => 'Product ID.',
				),
				'sku'                => array(
					'type'        => 'string',
					'description' => 'Product SKU.',
				),
				'include_variations' => array(
					'type'        => 'boolean',
					'description' => 'Include variations for variable products.',
					'default'     => false,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$product = null;

		if ( ! empty( $args['id'] ) ) {
			$product = wc_get_product( (int) $args['id'] );
		} elseif ( ! empty( $args['sku'] ) ) {
			$product_id = wc_get_product_id_by_sku( $args['sku'] );
			if ( $product_id ) {
				$product = wc_get_product( $product_id );
			}
		}

		if ( ! $product ) {
			return $this->error( 'Product not found.', 'not_found' );
		}

		$data = $this->format_product_full( $product );

		if ( ! empty( $args['include_variations'] ) && $product->is_type( 'variable' ) ) {
			$data['variations'] = $this->get_variations( $product );
		}

		return $this->success( $data );
	}

	private function format_product_full( \WC_Product $product ): array {
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

	private function get_terms( \WC_Product $product, string $taxonomy ): array {
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

	private function get_images( \WC_Product $product ): array {
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

	private function get_attributes( \WC_Product $product ): array {
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

	private function get_variations( \WC_Product $product ): array {
		$variations = array();
		$children   = $product->get_children();

		foreach ( $children as $variation_id ) {
			$variation = wc_get_product( $variation_id );
			if ( ! $variation ) {
				continue;
			}

			$variations[] = array(
				'id'             => $variation->get_id(),
				'sku'            => $variation->get_sku(),
				'price'          => $variation->get_price(),
				'regular_price'  => $variation->get_regular_price(),
				'sale_price'     => $variation->get_sale_price(),
				'stock_status'   => $variation->get_stock_status(),
				'stock_quantity' => $variation->get_stock_quantity(),
				'attributes'     => $variation->get_variation_attributes(),
				'image'          => $variation->get_image_id() ? wp_get_attachment_url( $variation->get_image_id() ) : null,
			);
		}

		return $variations;
	}
}
