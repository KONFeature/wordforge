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
        return __( 'Delete a WooCommerce product.', 'wordforge' );
    }

    public function get_capability(): string {
        return 'delete_products';
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
