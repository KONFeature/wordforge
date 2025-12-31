<?php

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;

/**
 * Save Product Ability - Create or update a WooCommerce product.
 *
 * Upsert pattern: provide 'id' to update existing, omit to create new.
 */
class SaveProduct extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-woocommerce';
    }

    public function get_title(): string {
        return __( 'Save Product', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Create or update a WooCommerce product. Provide "id" to update, omit to create.', 'wordforge' );
    }

    public function get_capability(): string|array {
        return [ 'edit_products', 'publish_products' ];
    }

    public function get_output_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'success' => [ 'type' => 'boolean' ],
                'data'    => [
                    'type'       => 'object',
                    'properties' => [
                        'id'        => [ 'type' => 'integer' ],
                        'created'   => [ 'type' => 'boolean' ],
                        'name'      => [ 'type' => 'string' ],
                        'type'      => [ 'type' => 'string' ],
                        'status'    => [ 'type' => 'string' ],
                        'permalink' => [ 'type' => 'string' ],
                    ],
                ],
                'message' => [ 'type' => 'string' ],
            ],
            'required' => [ 'success', 'data' ],
        ];
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'required'   => [ 'name' ],
            'properties' => [
                'id' => [
                    'type'        => 'integer',
                    'description' => 'Product ID to update. Omit to create new.',
                    'minimum'     => 1,
                ],
                'name' => [
                    'type' => 'string',
                ],
                'type' => [
                    'type'        => 'string',
                    'description' => 'Product type. Only applies to new products.',
                    'enum'        => [ 'simple', 'variable', 'grouped', 'external' ],
                    'default'     => 'simple',
                ],
                'status' => [
                    'type'        => 'string',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private', 'trash' ],
                    'default'     => 'draft',
                ],
                'description' => [
                    'type'        => 'string',
                    'description' => 'Supports HTML.',
                ],
                'short_description' => [
                    'type'        => 'string',
                    'description' => 'Shown above add-to-cart.',
                ],
                'sku' => [
                    'type' => 'string',
                ],
                'regular_price' => [
                    'type'        => 'string',
                    'description' => 'Without currency symbol.',
                ],
                'sale_price' => [
                    'type'        => 'string',
                    'description' => 'Must be less than regular_price.',
                ],
                'stock_status' => [
                    'type' => 'string',
                    'enum' => [ 'instock', 'outofstock', 'onbackorder' ],
                ],
                'stock_quantity' => [
                    'type'        => 'integer',
                    'description' => 'Requires manage_stock=true.',
                    'minimum'     => 0,
                ],
                'manage_stock' => [
                    'type'    => 'boolean',
                    'default' => false,
                ],
                'weight' => [
                    'type' => 'string',
                ],
                'dimensions' => [
                    'type'       => 'object',
                    'properties' => [
                        'length' => [ 'type' => 'string' ],
                        'width'  => [ 'type' => 'string' ],
                        'height' => [ 'type' => 'string' ],
                    ],
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'IDs or slugs. Replaces existing.',
                    'items'       => [
                        'oneOf' => [
                            [ 'type' => 'integer', 'minimum' => 1 ],
                            [ 'type' => 'string' ],
                        ],
                    ],
                ],
                'tags' => [
                    'type'        => 'array',
                    'description' => 'Names or slugs. Replaces existing.',
                    'items'       => [ 'type' => 'string' ],
                ],
                'featured' => [
                    'type'    => 'boolean',
                    'default' => false,
                ],
                'virtual' => [
                    'type'        => 'boolean',
                    'description' => 'No shipping required.',
                    'default'     => false,
                ],
                'downloadable' => [
                    'type'    => 'boolean',
                    'default' => false,
                ],
                'image_id' => [
                    'type'        => 'integer',
                    'description' => 'Attachment ID.',
                    'minimum'     => 1,
                ],
                'gallery_image_ids' => [
                    'type'        => 'array',
                    'description' => 'Attachment IDs.',
                    'items'       => [ 'type' => 'integer', 'minimum' => 1 ],
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $id = $args['id'] ?? null;
        $is_update = (bool) $id;

        if ( $is_update ) {
            $product = wc_get_product( (int) $id );
            if ( ! $product ) {
                return $this->error(
                    "Product #{$id} not found. Omit 'id' to create a new product.",
                    'not_found'
                );
            }
        } else {
            $type = $args['type'] ?? 'simple';
            $product = $this->create_product_by_type( $type );
        }

        $this->apply_product_fields( $product, $args );

        $product_id = $product->save();

        if ( ! $product_id ) {
            return $this->error(
                $is_update ? 'Failed to update product.' : 'Failed to create product.',
                'save_failed'
            );
        }

        return $this->success( [
            'id'        => $product_id,
            'created'   => ! $is_update,
            'name'      => $product->get_name(),
            'type'      => $product->get_type(),
            'status'    => $product->get_status(),
            'permalink' => $product->get_permalink(),
        ], $is_update ? 'Product updated successfully.' : 'Product created successfully.' );
    }

    private function create_product_by_type( string $type ): \WC_Product {
        switch ( $type ) {
            case 'variable':
                return new \WC_Product_Variable();
            case 'grouped':
                return new \WC_Product_Grouped();
            case 'external':
                return new \WC_Product_External();
            default:
                return new \WC_Product_Simple();
        }
    }

    private function apply_product_fields( \WC_Product $product, array $args ): void {
        if ( isset( $args['name'] ) ) {
            $product->set_name( sanitize_text_field( $args['name'] ) );
        }

        if ( isset( $args['status'] ) ) {
            $product->set_status( $args['status'] );
        }

        if ( isset( $args['description'] ) ) {
            $product->set_description( wp_kses_post( $args['description'] ) );
        }

        if ( isset( $args['short_description'] ) ) {
            $product->set_short_description( wp_kses_post( $args['short_description'] ) );
        }

        if ( isset( $args['sku'] ) ) {
            $product->set_sku( sanitize_text_field( $args['sku'] ) );
        }

        if ( isset( $args['regular_price'] ) ) {
            $product->set_regular_price( $args['regular_price'] );
        }

        if ( isset( $args['sale_price'] ) ) {
            $product->set_sale_price( $args['sale_price'] );
        }

        if ( isset( $args['stock_status'] ) ) {
            $product->set_stock_status( $args['stock_status'] );
        }

        if ( isset( $args['manage_stock'] ) ) {
            $product->set_manage_stock( $args['manage_stock'] );
        }

        if ( isset( $args['stock_quantity'] ) ) {
            $product->set_stock_quantity( $args['stock_quantity'] );
        }

        if ( isset( $args['weight'] ) ) {
            $product->set_weight( $args['weight'] );
        }

        if ( isset( $args['dimensions'] ) ) {
            if ( isset( $args['dimensions']['length'] ) ) {
                $product->set_length( $args['dimensions']['length'] );
            }
            if ( isset( $args['dimensions']['width'] ) ) {
                $product->set_width( $args['dimensions']['width'] );
            }
            if ( isset( $args['dimensions']['height'] ) ) {
                $product->set_height( $args['dimensions']['height'] );
            }
        }

        if ( isset( $args['featured'] ) ) {
            $product->set_featured( $args['featured'] );
        }

        if ( isset( $args['virtual'] ) ) {
            $product->set_virtual( $args['virtual'] );
        }

        if ( isset( $args['downloadable'] ) ) {
            $product->set_downloadable( $args['downloadable'] );
        }

        if ( isset( $args['image_id'] ) ) {
            $product->set_image_id( $args['image_id'] );
        }

        if ( isset( $args['gallery_image_ids'] ) ) {
            $product->set_gallery_image_ids( $args['gallery_image_ids'] );
        }

        if ( isset( $args['categories'] ) ) {
            $category_ids = $this->resolve_term_ids( $args['categories'], 'product_cat' );
            $product->set_category_ids( $category_ids );
        }

        if ( isset( $args['tags'] ) ) {
            $tag_ids = $this->resolve_term_ids( $args['tags'], 'product_tag' );
            $product->set_tag_ids( $tag_ids );
        }
    }

    private function resolve_term_ids( array $terms, string $taxonomy ): array {
        $ids = [];
        foreach ( $terms as $term ) {
            if ( is_numeric( $term ) ) {
                $ids[] = (int) $term;
            } else {
                $term_obj = get_term_by( 'slug', $term, $taxonomy );
                if ( $term_obj ) {
                    $ids[] = $term_obj->term_id;
                }
            }
        }
        return $ids;
    }
}
