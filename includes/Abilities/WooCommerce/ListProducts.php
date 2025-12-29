<?php

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;

class ListProducts extends AbstractAbility {

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
            'Retrieve a list of WooCommerce products with powerful filtering options. Filter by product type (simple, variable, etc.), ' .
            'publication status, category/tag, SKU, featured status, or sale status. Sort by date, title, price, popularity, or rating. ' .
            'Supports pagination for large product catalogs. Use this to browse your store inventory, find specific products, or generate ' .
            'product reports. Returns up to 100 products per page.',
            'wordforge'
        );
    }

    public function get_capability(): string {
        return 'edit_products';
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'status' => [
                    'type'    => 'string',
                    'enum'    => [ 'publish', 'draft', 'pending', 'private', 'trash', 'any' ],
                    'default' => 'any',
                ],
                'type' => [
                    'type'    => 'string',
                    'enum'    => [ 'simple', 'variable', 'grouped', 'external', 'any' ],
                    'default' => 'any',
                ],
                'category' => [
                    'type'        => 'string',
                    'description' => 'Product category slug.',
                ],
                'tag' => [
                    'type'        => 'string',
                    'description' => 'Product tag slug.',
                ],
                'sku' => [
                    'type'        => 'string',
                    'description' => 'Filter by SKU.',
                ],
                'per_page' => [
                    'type'    => 'integer',
                    'default' => 20,
                    'minimum' => 1,
                    'maximum' => 100,
                ],
                'page' => [
                    'type'    => 'integer',
                    'default' => 1,
                    'minimum' => 1,
                ],
                'orderby' => [
                    'type'    => 'string',
                    'enum'    => [ 'date', 'title', 'price', 'popularity', 'rating' ],
                    'default' => 'date',
                ],
                'order' => [
                    'type'    => 'string',
                    'enum'    => [ 'asc', 'desc' ],
                    'default' => 'desc',
                ],
                'featured' => [
                    'type' => 'boolean',
                ],
                'on_sale' => [
                    'type' => 'boolean',
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $query_args = [
            'status'   => $args['status'] ?? 'any',
            'limit'    => min( (int) ( $args['per_page'] ?? 20 ), 100 ),
            'page'     => max( (int) ( $args['page'] ?? 1 ), 1 ),
            'orderby'  => $args['orderby'] ?? 'date',
            'order'    => strtoupper( $args['order'] ?? 'DESC' ),
            'paginate' => true,
        ];

        if ( ! empty( $args['type'] ) && 'any' !== $args['type'] ) {
            $query_args['type'] = $args['type'];
        }

        if ( ! empty( $args['category'] ) ) {
            $query_args['category'] = [ $args['category'] ];
        }

        if ( ! empty( $args['tag'] ) ) {
            $query_args['tag'] = [ $args['tag'] ];
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

        $items = array_map( [ $this, 'format_product' ], $results->products );

        return $this->success( [
            'items'       => $items,
            'total'       => $results->total,
            'total_pages' => $results->max_num_pages,
            'page'        => $query_args['page'],
            'per_page'    => $query_args['limit'],
        ] );
    }

    protected function format_product( \WC_Product $product ): array {
        return [
            'id'             => $product->get_id(),
            'name'           => $product->get_name(),
            'slug'           => $product->get_slug(),
            'type'           => $product->get_type(),
            'status'         => $product->get_status(),
            'sku'            => $product->get_sku(),
            'price'          => $product->get_price(),
            'regular_price'  => $product->get_regular_price(),
            'sale_price'     => $product->get_sale_price(),
            'on_sale'        => $product->is_on_sale(),
            'stock_status'   => $product->get_stock_status(),
            'stock_quantity' => $product->get_stock_quantity(),
            'featured'       => $product->is_featured(),
            'short_description' => $product->get_short_description(),
            'categories'     => $this->get_term_names( $product, 'product_cat' ),
            'tags'           => $this->get_term_names( $product, 'product_tag' ),
            'image'          => $product->get_image_id() ? wp_get_attachment_url( $product->get_image_id() ) : null,
            'permalink'      => $product->get_permalink(),
        ];
    }

    private function get_term_names( \WC_Product $product, string $taxonomy ): array {
        $terms = get_the_terms( $product->get_id(), $taxonomy );
        if ( ! $terms || is_wp_error( $terms ) ) {
            return [];
        }
        return array_map( fn( $term ) => $term->name, $terms );
    }
}
