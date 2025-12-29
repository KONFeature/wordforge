<?php

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;

class CreateProduct extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-woocommerce';
    }

    public function get_title(): string {
        return __( 'Create Product', 'wordforge' );
    }

    public function get_description(): string {
        return __(
            'Create WooCommerce products (simple, variable, grouped, external) with pricing, inventory, images, and taxonomies. Defaults to draft status.',
            'wordforge'
        );
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
                    'type'        => 'string',
                    'description' => 'Product name displayed in store.',
                    'minLength'   => 1,
                    'maxLength'   => 200,
                ],
                'type' => [
                    'type'        => 'string',
                    'description' => 'Product type: "simple" (single SKU), "variable" (variations), "grouped" (collection), "external" (offsite).',
                    'enum'        => [ 'simple', 'variable', 'grouped', 'external' ],
                    'default'     => 'simple',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'Publication status: "publish" (live), "draft" (not visible), "pending" (review), "private" (hidden).',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private' ],
                    'default'     => 'draft',
                ],
                'description' => [
                    'type'        => 'string',
                    'description' => 'Full product description with details and features. Supports HTML.',
                ],
                'short_description' => [
                    'type'        => 'string',
                    'description' => 'Brief summary above add-to-cart button. Supports HTML.',
                    'maxLength'   => 1000,
                ],
                'sku' => [
                    'type'        => 'string',
                    'description' => 'Stock Keeping Unit for inventory tracking, e.g., "WOO-SHIRT-BLUE-M".',
                    'maxLength'   => 100,
                ],
                'regular_price' => [
                    'type'        => 'string',
                    'description' => 'Regular price, e.g., "19.99". Decimal format without currency symbols.',
                    'pattern'     => '^\\d+(\\.\\d{1,2})?$',
                ],
                'sale_price' => [
                    'type'        => 'string',
                    'description' => 'Sale price, e.g., "14.99". Must be less than regular_price.',
                    'pattern'     => '^\\d+(\\.\\d{1,2})?$',
                ],
                'stock_status' => [
                    'type'        => 'string',
                    'description' => 'Stock availability: "instock" (available), "outofstock" (unavailable), "onbackorder" (orderable but out).',
                    'enum'        => [ 'instock', 'outofstock', 'onbackorder' ],
                ],
                'stock_quantity' => [
                    'type'        => 'integer',
                    'description' => 'Number of items in stock. Only used if manage_stock is true.',
                    'minimum'     => 0,
                ],
                'manage_stock' => [
                    'type'        => 'boolean',
                    'description' => 'Enable automatic stock tracking and overselling prevention.',
                    'default'     => false,
                ],
                'weight' => [
                    'type'        => 'string',
                    'description' => 'Product weight in default unit for shipping, e.g., "2.5".',
                    'pattern'     => '^\\d+(\\.\\d+)?$',
                ],
                'dimensions' => [
                    'type'        => 'object',
                    'description' => 'Product dimensions for shipping in default unit.',
                    'properties'  => [
                        'length' => [
                            'type'        => 'string',
                            'description' => 'Product length, e.g., "30".',
                            'pattern'     => '^\\d+(\\.\\d+)?$',
                        ],
                        'width' => [
                            'type'        => 'string',
                            'description' => 'Product width, e.g., "20".',
                            'pattern'     => '^\\d+(\\.\\d+)?$',
                        ],
                        'height' => [
                            'type'        => 'string',
                            'description' => 'Product height, e.g., "10".',
                            'pattern'     => '^\\d+(\\.\\d+)?$',
                        ],
                    ],
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'Product category assignments. Provide category IDs or slugs.',
                    'items'       => [
                        'oneOf' => [
                            [
                                'type'        => 'integer',
                                'description' => 'Category term ID',
                                'minimum'     => 1,
                            ],
                            [
                                'type'        => 'string',
                                'description' => 'Category slug',
                                'pattern'     => '^[a-z0-9-]+$',
                            ],
                        ],
                    ],
                ],
                'tags' => [
                    'type'        => 'array',
                    'description' => 'Product tag assignments. Provide tag names or slugs.',
                    'items'       => [
                        'type'        => 'string',
                        'description' => 'Tag name or slug',
                        'minLength'   => 1,
                        'maxLength'   => 200,
                    ],
                ],
                'featured' => [
                    'type'        => 'boolean',
                    'description' => 'Mark as featured product for special sections/widgets.',
                    'default'     => false,
                ],
                'virtual' => [
                    'type'        => 'boolean',
                    'description' => 'Virtual product (no shipping). True for services/digital goods.',
                    'default'     => false,
                ],
                'downloadable' => [
                    'type'        => 'boolean',
                    'description' => 'Downloadable product. True for software/ebooks/music.',
                    'default'     => false,
                ],
                'image_id' => [
                    'type'        => 'integer',
                    'description' => 'Main product image attachment ID. Upload media first.',
                    'minimum'     => 1,
                ],
                'gallery_image_ids' => [
                    'type'        => 'array',
                    'description' => 'Additional gallery images. Provide attachment IDs.',
                    'items'       => [
                        'type'        => 'integer',
                        'description' => 'Media attachment ID',
                        'minimum'     => 1,
                    ],
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
