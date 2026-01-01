<?php
/**
 * Update Order Status Ability - Change WooCommerce order status.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Orders;

use WordForge\Abilities\AbstractAbility;

class UpdateOrderStatus extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-woocommerce';
	}

	protected function is_read_only(): bool {
		return false;
	}

	public function get_title(): string {
		return __( 'Update Order Status', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Update the status of a WooCommerce order. Change orders between statuses like pending, processing, on-hold, ' .
			'completed, cancelled, or refunded. Optionally add a note explaining the status change. Use this to advance ' .
			'orders through your workflow or handle customer requests.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_shop_orders';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'id', 'status' ],
			'properties' => [
				'id'     => [
					'type'        => 'integer',
					'description' => 'Order ID to update.',
					'minimum'     => 1,
				],
				'status' => [
					'type'        => 'string',
					'description' => 'New order status.',
					'enum'        => [ 'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed' ],
				],
				'note'   => [
					'type'        => 'string',
					'description' => 'Optional note to add explaining the status change.',
					'maxLength'   => 1000,
				],
			],
		];
	}

	public function execute( array $args ): array {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return $this->error( 'WooCommerce is not active.', 'woocommerce_inactive' );
		}

		$order = wc_get_order( absint( $args['id'] ) );

		if ( ! $order ) {
			return $this->error( 'Order not found.', 'not_found' );
		}

		$previous_status = $order->get_status();
		$new_status      = sanitize_text_field( $args['status'] );

		if ( $previous_status === $new_status ) {
			return $this->success(
				[
					'id'              => $order->get_id(),
					'previous_status' => $previous_status,
					'new_status'      => $new_status,
					'changed'         => false,
				],
				'Order already has this status.'
			);
		}

		$note = ! empty( $args['note'] ) ? sanitize_textarea_field( $args['note'] ) : '';

		$order->update_status( $new_status, $note );

		return $this->success(
			[
				'id'              => $order->get_id(),
				'number'          => $order->get_order_number(),
				'previous_status' => $previous_status,
				'new_status'      => $order->get_status(),
				'changed'         => true,
				'note_added'      => ! empty( $note ),
			],
			sprintf( 'Order #%s status changed from %s to %s.', $order->get_order_number(), $previous_status, $new_status )
		);
	}
}
