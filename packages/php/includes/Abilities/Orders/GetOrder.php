<?php
/**
 * Get Order Ability - Get WooCommerce order details.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Orders;

use WordForge\Abilities\AbstractAbility;

class GetOrder extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-woocommerce';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Order', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve complete details of a WooCommerce order by ID. Returns full order information including line items, ' .
			'billing/shipping addresses, payment details, order notes, and refunds. Use this to view order details, ' .
			'troubleshoot order issues, or gather information before making changes.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_shop_orders';
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'id' ),
			'properties' => array(
				'id'            => array(
					'type'        => 'integer',
					'description' => 'Order ID to retrieve.',
					'minimum'     => 1,
				),
				'include_notes' => array(
					'type'        => 'boolean',
					'description' => 'Include order notes in the response.',
					'default'     => false,
				),
			),
		);
	}

	public function execute( array $args ): array {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return $this->error( 'WooCommerce is not active.', 'woocommerce_inactive' );
		}

		$order = wc_get_order( absint( $args['id'] ) );

		if ( ! $order ) {
			return $this->error( 'Order not found.', 'not_found' );
		}

		$data = $this->format_order( $order );

		if ( ! empty( $args['include_notes'] ) ) {
			$data['notes'] = $this->get_order_notes( $order->get_id() );
		}

		return $this->success( $data );
	}

	/**
	 * @param \WC_Order $order
	 * @return array<string, mixed>
	 */
	private function format_order( \WC_Order $order ): array {
		return array(
			'id'               => $order->get_id(),
			'number'           => $order->get_order_number(),
			'status'           => $order->get_status(),
			'date_created'     => $order->get_date_created()?->format( 'Y-m-d H:i:s' ),
			'date_modified'    => $order->get_date_modified()?->format( 'Y-m-d H:i:s' ),
			'date_completed'   => $order->get_date_completed()?->format( 'Y-m-d H:i:s' ),
			'date_paid'        => $order->get_date_paid()?->format( 'Y-m-d H:i:s' ),
			'subtotal'         => $order->get_subtotal(),
			'total'            => $order->get_total(),
			'total_tax'        => $order->get_total_tax(),
			'shipping_total'   => $order->get_shipping_total(),
			'discount_total'   => $order->get_discount_total(),
			'currency'         => $order->get_currency(),
			'payment_method'   => $order->get_payment_method(),
			'payment_title'    => $order->get_payment_method_title(),
			'transaction_id'   => $order->get_transaction_id(),
			'customer_id'      => $order->get_customer_id(),
			'customer_note'    => $order->get_customer_note(),
			'billing'          => $this->format_address( $order, 'billing' ),
			'shipping'         => $this->format_address( $order, 'shipping' ),
			'line_items'       => $this->format_line_items( $order ),
			'shipping_methods' => $this->format_shipping_methods( $order ),
			'coupons'          => $this->format_coupons( $order ),
			'refunds'          => $this->format_refunds( $order ),
		);
	}

	/**
	 * @param \WC_Order $order
	 * @param string    $type
	 * @return array<string, string>
	 */
	private function format_address( \WC_Order $order, string $type ): array {
		$getter = "get_{$type}_";
		return array(
			'first_name' => $order->{$getter . 'first_name'}(),
			'last_name'  => $order->{$getter . 'last_name'}(),
			'company'    => $order->{$getter . 'company'}(),
			'address_1'  => $order->{$getter . 'address_1'}(),
			'address_2'  => $order->{$getter . 'address_2'}(),
			'city'       => $order->{$getter . 'city'}(),
			'state'      => $order->{$getter . 'state'}(),
			'postcode'   => $order->{$getter . 'postcode'}(),
			'country'    => $order->{$getter . 'country'}(),
			'email'      => 'billing' === $type ? $order->get_billing_email() : '',
			'phone'      => 'billing' === $type ? $order->get_billing_phone() : '',
		);
	}

	/**
	 * @param \WC_Order $order
	 * @return array<int, array<string, mixed>>
	 */
	private function format_line_items( \WC_Order $order ): array {
		$items = array();
		foreach ( $order->get_items() as $item ) {
			$product = $item->get_product();
			$items[] = array(
				'id'           => $item->get_id(),
				'name'         => $item->get_name(),
				'product_id'   => $item->get_product_id(),
				'variation_id' => $item->get_variation_id(),
				'quantity'     => $item->get_quantity(),
				'subtotal'     => $item->get_subtotal(),
				'total'        => $item->get_total(),
				'sku'          => $product ? $product->get_sku() : '',
			);
		}
		return $items;
	}

	/**
	 * @param \WC_Order $order
	 * @return array<int, array<string, mixed>>
	 */
	private function format_shipping_methods( \WC_Order $order ): array {
		$methods = array();
		foreach ( $order->get_shipping_methods() as $method ) {
			$methods[] = array(
				'id'     => $method->get_id(),
				'method' => $method->get_method_title(),
				'total'  => $method->get_total(),
			);
		}
		return $methods;
	}

	/**
	 * @param \WC_Order $order
	 * @return array<int, array<string, mixed>>
	 */
	private function format_coupons( \WC_Order $order ): array {
		$coupons = array();
		foreach ( $order->get_coupons() as $coupon ) {
			$coupons[] = array(
				'code'     => $coupon->get_code(),
				'discount' => $coupon->get_discount(),
			);
		}
		return $coupons;
	}

	/**
	 * @param \WC_Order $order
	 * @return array<int, array<string, mixed>>
	 */
	private function format_refunds( \WC_Order $order ): array {
		$refunds = array();
		foreach ( $order->get_refunds() as $refund ) {
			$refunds[] = array(
				'id'     => $refund->get_id(),
				'amount' => $refund->get_amount(),
				'reason' => $refund->get_reason(),
				'date'   => $refund->get_date_created()?->format( 'Y-m-d H:i:s' ),
			);
		}
		return $refunds;
	}

	/**
	 * @param int $order_id
	 * @return array<int, array<string, mixed>>
	 */
	private function get_order_notes( int $order_id ): array {
		$notes = wc_get_order_notes( array( 'order_id' => $order_id ) );
		return array_map(
			fn( $note ) => array(
				'id'            => $note->id,
				'content'       => $note->content,
				'date'          => $note->date_created->format( 'Y-m-d H:i:s' ),
				'customer_note' => $note->customer_note,
				'added_by'      => $note->added_by,
			),
			$notes
		);
	}
}
