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
            'Create a new WooCommerce product of any type (simple, variable, grouped, external). Supports full product configuration ' .
            'including pricing, inventory management, dimensions/weight, product images, categories/tags, and custom attributes. ' .
            'Products default to "draft" status for safety. Use this to add new products to your store, including physical products, ' .
            'digital downloads, or service-based offerings.',
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
                    'description' => 'Product name/title displayed in the store. This is the main product heading customers see.',
                    'minLength'   => 1,
                    'maxLength'   => 200,
                ],
                'type' => [
                    'type'        => 'string',
                    'description' => 'Product type: "simple" (standard product with single SKU), "variable" (product with variations like size/color), "grouped" (collection of related products), "external" (product sold on external site). Defaults to "simple".',
                    'enum'        => [ 'simple', 'variable', 'grouped', 'external' ],
                    'default'     => 'simple',
                ],
                'status' => [
                    'type'        => 'string',
                    'description' => 'Publication status: "publish" (live in store), "draft" (saved but not visible), "pending" (awaiting review), "private" (hidden from public). Defaults to "draft" for safety.',
                    'enum'        => [ 'publish', 'draft', 'pending', 'private' ],
                    'default'     => 'draft',
                ],
                'description' => [
                    'type'        => 'string',
                    'description' => 'Full product description with details, features, specifications. Supports HTML formatting. Displayed on product page in main content area.',
                ],
                'short_description' => [
                    'type'        => 'string',
                    'description' => 'Brief product summary displayed above add-to-cart button. Keep concise (1-3 sentences). Supports HTML.',
                    'maxLength'   => 1000,
                ],
                'sku' => [
                    'type'        => 'string',
                    'description' => 'Stock Keeping Unit - unique identifier for inventory tracking. Recommended for inventory management. Example: "WOO-SHIRT-BLUE-M".',
                    'maxLength'   => 100,
                ],
                'regular_price' => [
                    'type'        => 'string',
                    'description' => 'Regular price in store currency (e.g., "19.99"). Use decimal format without currency symbols. Required for most product types.',
                    'pattern'     => '^\\d+(\\.\\d{1,2})?$',
                ],
                'sale_price' => [
                    'type'        => 'string',
                    'description' => 'Sale/discounted price if product is on sale (e.g., "14.99"). Must be less than regular_price. Leave empty if not on sale.',
                    'pattern'     => '^\\d+(\\.\\d{1,2})?$',
                ],
                'stock_status' => [
                    'type'        => 'string',
                    'description' => 'Stock availability: "instock" (available for purchase), "outofstock" (unavailable), "onbackorder" (can order but currently out of stock).',
                    'enum'        => [ 'instock', 'outofstock', 'onbackorder' ],
                ],
                'stock_quantity' => [
                    'type'        => 'integer',
                    'description' => 'Exact number of items in stock. Only used if manage_stock is true. WooCommerce will automatically update this when orders are placed.',
                    'minimum'     => 0,
                ],
                'manage_stock' => [
                    'type'        => 'boolean',
                    'description' => 'Enable automatic stock management. When true, WooCommerce tracks inventory and prevents overselling based on stock_quantity.',
                    'default'     => false,
                ],
                'weight' => [
                    'type'        => 'string',
                    'description' => 'Product weight in store\'s default weight unit (usually kg or lbs). Used for shipping calculations. Example: "2.5" for 2.5kg.',
                    'pattern'     => '^\\d+(\\.\\d+)?$',
                ],
                'dimensions' => [
                    'type'        => 'object',
                    'description' => 'Product dimensions for shipping calculations. Provide in store\'s default length unit (usually cm or inches).',
                    'properties'  => [
                        'length' => [
                            'type'        => 'string',
                            'description' => 'Product length (e.g., "30" for 30cm).',
                            'pattern'     => '^\\d+(\\.\\d+)?$',
                        ],
                        'width' => [
                            'type'        => 'string',
                            'description' => 'Product width (e.g., "20" for 20cm).',
                            'pattern'     => '^\\d+(\\.\\d+)?$',
                        ],
                        'height' => [
                            'type'        => 'string',
                            'description' => 'Product height (e.g., "10" for 10cm).',
                            'pattern'     => '^\\d+(\\.\\d+)?$',
                        ],
                    ],
                ],
                'categories' => [
                    'type'        => 'array',
                    'description' => 'Product category assignments. Provide category IDs (integers) or slugs (strings). Creates product organization and filtering.',
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
                    'description' => 'Product tag assignments for additional categorization and search. Provide tag names or slugs.',
                    'items'       => [
                        'type'        => 'string',
                        'description' => 'Tag name or slug',
                        'minLength'   => 1,
                        'maxLength'   => 200,
                    ],
                ],
                'featured' => [
                    'type'        => 'boolean',
                    'description' => 'Mark as featured product. Featured products appear in special sections/widgets. Good for promotions or bestsellers.',
                    'default'     => false,
                ],
                'virtual' => [
                    'type'        => 'boolean',
                    'description' => 'Virtual product (no shipping required). Set true for services, digital goods, bookings. Disables shipping fields.',
                    'default'     => false,
                ],
                'downloadable' => [
                    'type'        => 'boolean',
                    'description' => 'Downloadable product (provides digital files). Set true for software, ebooks, music. Enables download configuration.',
                    'default'     => false,
                ],
                'image_id' => [
                    'type'        => 'integer',
                    'description' => 'Main product image attachment ID. Upload media first using upload-media ability. This image shows in product listings and at top of product page.',
                    'minimum'     => 1,
                ],
                'gallery_image_ids' => [
                    'type'        => 'array',
                    'description' => 'Additional product images shown in gallery below main image. Provide array of attachment IDs. Customers can browse through these images.',
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
