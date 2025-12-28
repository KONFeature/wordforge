<?php

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;

class CreateProduct extends AbstractAbility {

    public function get_title(): string {
        return __( 'Create Product', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Create a new WooCommerce product.', 'wordforge' );
    }

    public function get_capability(): string {
        return 'publish_products';
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'required'   => [ 'name' ],
            'properties' => [
                'name' => [
                    'type' => 'string',
                ],
                'type' => [
                    'type'    => 'string',
                    'enum'    => [ 'simple', 'variable', 'grouped', 'external' ],
                    'default' => 'simple',
                ],
                'status' => [
                    'type'    => 'string',
                    'enum'    => [ 'publish', 'draft', 'pending', 'private' ],
                    'default' => 'draft',
                ],
                'description' => [
                    'type' => 'string',
                ],
                'short_description' => [
                    'type' => 'string',
                ],
                'sku' => [
                    'type' => 'string',
                ],
                'regular_price' => [
                    'type' => 'string',
                ],
                'sale_price' => [
                    'type' => 'string',
                ],
                'stock_status' => [
                    'type' => 'string',
                    'enum' => [ 'instock', 'outofstock', 'onbackorder' ],
                ],
                'stock_quantity' => [
                    'type' => 'integer',
                ],
                'manage_stock' => [
                    'type' => 'boolean',
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
                    'type'  => 'array',
                    'items' => [
                        'oneOf' => [
                            [ 'type' => 'integer' ],
                            [ 'type' => 'string' ],
                        ],
                    ],
                ],
                'tags' => [
                    'type'  => 'array',
                    'items' => [ 'type' => 'string' ],
                ],
                'featured' => [
                    'type' => 'boolean',
                ],
                'virtual' => [
                    'type' => 'boolean',
                ],
                'downloadable' => [
                    'type' => 'boolean',
                ],
                'image_id' => [
                    'type' => 'integer',
                ],
                'gallery_image_ids' => [
                    'type'  => 'array',
                    'items' => [ 'type' => 'integer' ],
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $type = $args['type'] ?? 'simple';
        
        $product = $this->create_product_by_type( $type );
        
        $product->set_name( sanitize_text_field( $args['name'] ) );
        $product->set_status( $args['status'] ?? 'draft' );

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

        $product_id = $product->save();

        if ( ! $product_id ) {
            return $this->error( 'Failed to create product.', 'create_failed' );
        }

        return $this->success( [
            'id'        => $product_id,
            'name'      => $product->get_name(),
            'type'      => $product->get_type(),
            'status'    => $product->get_status(),
            'permalink' => $product->get_permalink(),
        ], 'Product created successfully.' );
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
