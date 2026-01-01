<?php
/**
 * List Orders Ability - List WooCommerce orders.
 *
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
		return __( 'List Orders', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve a list of WooCommerce orders with filtering by status, customer, date range, and more. Use this to ' .
			'review recent orders, find orders by customer, check pending orders, or generate order reports. Returns order ' .
			'summaries including totals, items count, and customer info. Supports pagination for large order volumes.',
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
					'status'      => array(
						'type'        => 'string',
						'description' => 'Filter by order status (pending, processing, on-hold, completed, cancelled, refunded, failed, or any).',
						'default'     => 'any',
					),
					'customer_id' => array(
						'type'        => 'integer',
						'description' => 'Filter by customer user ID.',
						'minimum'     => 1,
					),
					'date_after'  => array(
						'type'        => 'string',
						'description' => 'Filter orders created after this date (YYYY-MM-DD).',
						'format'      => 'date',
					),
					'date_before' => array(
						'type'        => 'string',
						'description' => 'Filter orders created before this date (YYYY-MM-DD).',
						'format'      => 'date',
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
			$query_args['customer_id'] = absint( $args['customer_id'] );
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
