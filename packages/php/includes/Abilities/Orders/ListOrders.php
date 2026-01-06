<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Orders;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListOrders extends AbstractAbility {

	use PaginationSchemaTrait;

	public function get_category(): string {
		return 'wordforge-woocommerce';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Orders', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Get a single order by ID (full details with line items, addresses, notes) or list orders with filtering. ' .
			'USE: View order details, review recent orders, find by customer. ' .
			'NOT FOR: Changing order status (use update-order-status).',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_shop_orders';
	}

	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			$this->get_order_item_schema(),
			'Array of orders matching the query filters.'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
					'id'            => array(
						'type'        => 'integer',
						'description' => 'Order ID. When provided, returns full details for that single order. Omit to list orders.',
						'minimum'     => 1,
					),
					'include_notes' => array(
						'type'        => 'boolean',
						'description' => 'When fetching single order by ID, include order notes.',
						'default'     => false,
					),
					'status'        => array(
						'type'        => 'string',
						'description' => 'Filter by order status (pending, processing, on-hold, completed, cancelled, refunded, failed, or any).',
						'default'     => 'any',
					),
					'customer_id'   => array(
						'type'        => 'integer',
						'description' => 'Filter by customer user ID.',
						'minimum'     => 1,
					),
					'date_after'    => array(
						'type'        => 'string',
						'description' => 'Filter orders created after this date (YYYY-MM-DD).',
					),
					'date_before'   => array(
						'type'        => 'string',
						'description' => 'Filter orders created before this date (YYYY-MM-DD).',
					),
				),
				$this->get_pagination_input_schema(
					array( 'date', 'id', 'total' )
				)
			),
		);
	}

	public function execute( array $args ): array {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return $this->error( 'WooCommerce is not active.', 'woocommerce_inactive' );
		}

		if ( ! empty( $args['id'] ) ) {
			return $this->get_single_order( (int) $args['id'], ! empty( $args['include_notes'] ) );
		}

		return $this->list_orders( $args );
	}

	protected function get_single_order( int $order_id, bool $include_notes ): array {
		$order = wc_get_order( $order_id );

		if ( ! $order ) {
			return $this->error( 'Order not found.', 'not_found' );
		}

		$data = $this->format_order_full( $order );

		if ( $include_notes ) {
			$data['notes'] = $this->get_order_notes( $order->get_id() );
		}

		return $this->paginated_success(
			array( $data ),
			1,
			1,
			array(
				'page'     => 1,
				'per_page' => 1,
			)
		);
	}

	protected function format_order_full( \WC_Order $order ): array {
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

	protected function format_address( \WC_Order $order, string $type ): array {
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

	protected function format_line_items( \WC_Order $order ): array {
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

	protected function format_shipping_methods( \WC_Order $order ): array {
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

	protected function format_coupons( \WC_Order $order ): array {
		$coupons = array();
		foreach ( $order->get_coupons() as $coupon ) {
			$coupons[] = array(
				'code'     => $coupon->get_code(),
				'discount' => $coupon->get_discount(),
			);
		}
		return $coupons;
	}

	protected function format_refunds( \WC_Order $order ): array {
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

	protected function get_order_notes( int $order_id ): array {
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

	protected function list_orders( array $args ): array {
		$pagination = $this->normalize_pagination_args( $args );

		$query_args = array(
			'limit'    => $pagination['per_page'],
			'page'     => $pagination['page'],
			'orderby'  => $pagination['orderby'],
			'order'    => $pagination['order'],
			'paginate' => true,
		);

		if ( ! empty( $args['status'] ) && 'any' !== $args['status'] ) {
			$query_args['status'] = $args['status'];
		}

		if ( ! empty( $args['customer_id'] ) ) {
			$query_args['customer_id'] = (int) $args['customer_id'];
		}

		if ( ! empty( $args['date_after'] ) ) {
			$query_args['date_created'] = '>' . sanitize_text_field( $args['date_after'] );
		}

		if ( ! empty( $args['date_before'] ) ) {
			$before = sanitize_text_field( $args['date_before'] );
			if ( isset( $query_args['date_created'] ) ) {
				$query_args['date_created'] .= '...<' . $before;
			} else {
				$query_args['date_created'] = '<' . $before;
			}
		}

		$results = wc_get_orders( $query_args );

		$items = array_map( array( $this, 'format_order' ), $results->orders );

		return $this->paginated_success( $items, $results->total, $results->max_num_pages, $pagination );
	}

	/**
	 * @param \WC_Order $order
	 * @return array<string, mixed>
	 */
	private function format_order( \WC_Order $order ): array {
		return array(
			'id'              => $order->get_id(),
			'number'          => $order->get_order_number(),
			'status'          => $order->get_status(),
			'date_created'    => $order->get_date_created()?->format( 'Y-m-d H:i:s' ),
			'date_modified'   => $order->get_date_modified()?->format( 'Y-m-d H:i:s' ),
			'total'           => $order->get_total(),
			'currency'        => $order->get_currency(),
			'customer_id'     => $order->get_customer_id(),
			'customer_email'  => $order->get_billing_email(),
			'customer_name'   => $order->get_formatted_billing_full_name(),
			'items_count'     => $order->get_item_count(),
			'payment_method'  => $order->get_payment_method_title(),
			'shipping_method' => implode( ', ', array_map( fn( $s ) => $s->get_method_title(), $order->get_shipping_methods() ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_order_item_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'              => array(
					'type'        => 'integer',
					'description' => 'Order ID',
				),
				'number'          => array(
					'type'        => 'string',
					'description' => 'Order number',
				),
				'status'          => array(
					'type'        => 'string',
					'description' => 'Order status',
				),
				'date_created'    => array(
					'type'        => 'string',
					'description' => 'Date created',
				),
				'total'           => array(
					'type'        => 'string',
					'description' => 'Order total',
				),
				'currency'        => array(
					'type'        => 'string',
					'description' => 'Currency code',
				),
				'customer_id'     => array(
					'type'        => 'integer',
					'description' => 'Customer user ID',
				),
				'customer_email'  => array(
					'type'        => 'string',
					'description' => 'Customer email',
				),
				'customer_name'   => array(
					'type'        => 'string',
					'description' => 'Customer name',
				),
				'items_count'     => array(
					'type'        => 'integer',
					'description' => 'Number of items',
				),
				'payment_method'  => array(
					'type'        => 'string',
					'description' => 'Payment method',
				),
				'shipping_method' => array(
					'type'        => 'string',
					'description' => 'Shipping method',
				),
			),
		);
	}
}
