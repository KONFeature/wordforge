<?php

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;

class DeleteProduct extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-woocommerce';
    }

    protected function is_destructive(): bool {
        return true;
    }

    public function get_title(): string {
        return __( 'Delete Product', 'wordforge' );
    }

    public function get_description(): string {
        return __(
            'Delete a WooCommerce product from the store. By default, products are moved to trash (recoverable). Use force=true for permanent ' .
            'deletion (cannot be undone). Permanently deleting a product removes all associated data including order history references. ' .
            'WARNING: Deleting products that have been ordered may affect order records and reporting. For variable products, also deletes ' .
            'all variations. Use with caution.',
            'wordforge'
        );
    }

    public function get_capability(): string {
        return 'delete_products';
    }

    public function get_output_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'success' => [ 'type' => 'boolean' ],
                'data'    => [
                    'type'       => 'object',
                    'properties' => [
                        'id'      => [ 'type' => 'integer' ],
                        'deleted' => [ 'type' => 'boolean' ],
                        'force'   => [ 'type' => 'boolean' ],
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
            'required'   => [ 'id' ],
            'properties' => [
                'id' => [
                    'type' => 'integer',
                ],
                'force' => [
                    'type'        => 'boolean',
                    'description' => 'Permanently delete instead of moving to trash.',
                    'default'     => false,
                ],
            ],
        ];
    }

    public function execute( array $args ): array {
        $product = wc_get_product( (int) $args['id'] );

        if ( ! $product ) {
            return $this->error( 'Product not found.', 'not_found' );
        }

        $product_id = $product->get_id();
        $product_name = $product->get_name();
        $force = (bool) ( $args['force'] ?? false );

        $result = $product->delete( $force );

        if ( ! $result ) {
            return $this->error( 'Failed to delete product.', 'delete_failed' );
        }

        $action = $force ? 'permanently deleted' : 'moved to trash';

        return $this->success( [
            'id'      => $product_id,
            'deleted' => true,
            'force'   => $force,
        ], sprintf( 'Product "%s" %s.', $product_name, $action ) );
    }
}
