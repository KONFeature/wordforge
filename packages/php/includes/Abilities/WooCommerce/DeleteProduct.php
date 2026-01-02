<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\WooCommerce;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\DeletePatternTrait;

class DeleteProduct extends AbstractAbility {

	use DeletePatternTrait;

	public function get_category(): string {
		return 'wordforge-woocommerce';
	}

	public function get_title(): string {
		return __( 'Delete Product', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Delete a WooCommerce product. Default: moves to trash (recoverable). Use force=true for permanent deletion. ' .
			'WARNING: Permanent deletion removes all data including variations. May affect order history references.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'delete_products';
	}

	public function get_input_schema(): array {
		return $this->get_delete_input_schema( true, 'product' );
	}

	public function get_output_schema(): array {
		return $this->get_delete_output_schema();
	}

	public function execute( array $args ): array {
		$product = wc_get_product( (int) $args['id'] );

		if ( ! $product ) {
			return $this->delete_not_found( 'Product' );
		}

		$product_id   = $product->get_id();
		$product_name = $product->get_name();
		$force        = $this->is_force_delete( $args );

		$result = $product->delete( $force );

		if ( ! $result ) {
			return $this->delete_failed( 'product' );
		}

		return $this->delete_success( $product_id, 'product', $product_name, $force );
	}
}
