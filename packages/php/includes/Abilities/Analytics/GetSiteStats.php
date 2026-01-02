<?php
/**
 * Get Site Stats Ability - Retrieve site statistics and analytics.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Analytics;

use WordForge\Abilities\AbstractAbility;

class GetSiteStats extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-analytics';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Site Stats', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve comprehensive site statistics including content counts by type and status, user counts by role, ' .
			'comment statistics, taxonomy term counts, and recent activity. Use this to get an overview of site content, ' .
			'audit content health, or generate reports. Optionally include WooCommerce stats if the plugin is active.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_posts';
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'include_woocommerce' => array(
					'type'        => 'boolean',
					'description' => 'Include WooCommerce statistics if available.',
					'default'     => true,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$stats = array(
			'content'    => $this->get_content_stats(),
			'users'      => $this->get_user_stats(),
			'comments'   => $this->get_comment_stats(),
			'taxonomies' => $this->get_taxonomy_stats(),
			'recent'     => $this->get_recent_activity(),
		);

		$include_woo = $args['include_woocommerce'] ?? true;
		if ( $include_woo && function_exists( 'is_woocommerce_active' ) && is_woocommerce_active() ) {
			$stats['woocommerce'] = $this->get_woocommerce_stats();
		}

		return $this->success( $stats );
	}

	/**
	 * @return array<string, array<string, int>>
	 */
	private function get_content_stats(): array {
		$post_types = get_post_types( array( 'public' => true ), 'names' );
		unset( $post_types['attachment'] );

		$stats = array();
		foreach ( $post_types as $type ) {
			$counts         = wp_count_posts( $type );
			$stats[ $type ] = array(
				'publish' => (int) $counts->publish,
				'draft'   => (int) $counts->draft,
				'pending' => (int) $counts->pending,
				'private' => (int) $counts->private,
				'trash'   => (int) $counts->trash,
				'total'   => (int) $counts->publish + (int) $counts->draft + (int) $counts->pending + (int) $counts->private,
			);
		}

		$media_counts   = wp_count_attachments();
		$stats['media'] = array(
			'total'  => array_sum( (array) $media_counts ),
			'images' => (int) ( $media_counts->{'image/jpeg'} ?? 0 ) +
						(int) ( $media_counts->{'image/png'} ?? 0 ) +
						(int) ( $media_counts->{'image/gif'} ?? 0 ) +
						(int) ( $media_counts->{'image/webp'} ?? 0 ),
		);

		return $stats;
	}

	/**
	 * @return array<string, int>
	 */
	private function get_user_stats(): array {
		$user_count = count_users();

		return array(
			'total'   => $user_count['total_users'],
			'by_role' => $user_count['avail_roles'],
		);
	}

	/**
	 * @return array<string, int>
	 */
	private function get_comment_stats(): array {
		$counts = wp_count_comments();

		return array(
			'total'               => (int) $counts->total_comments,
			'approved'            => (int) $counts->approved,
			'awaiting_moderation' => (int) $counts->moderated,
			'spam'                => (int) $counts->spam,
			'trash'               => (int) $counts->trash,
		);
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function get_taxonomy_stats(): array {
		$taxonomies = get_taxonomies( array( 'public' => true ), 'objects' );
		$stats      = array();

		foreach ( $taxonomies as $tax ) {
			$count = wp_count_terms( array( 'taxonomy' => $tax->name ) );
			if ( ! is_wp_error( $count ) && $count > 0 ) {
				$stats[ $tax->name ] = array(
					'label' => $tax->label,
					'count' => (int) $count,
				);
			}
		}

		return $stats;
	}

	/**
	 * @return array<string, array<int, array<string, mixed>>>
	 */
	private function get_recent_activity(): array {
		$recent_posts = get_posts(
			array(
				'numberposts' => 5,
				'post_status' => 'any',
				'orderby'     => 'modified',
				'order'       => 'DESC',
			)
		);

		$recent_comments = get_comments(
			array(
				'number'  => 5,
				'orderby' => 'comment_date',
				'order'   => 'DESC',
			)
		);

		return array(
			'posts'    => array_map(
				fn( $p ) => array(
					'id'       => $p->ID,
					'title'    => $p->post_title,
					'status'   => $p->post_status,
					'modified' => $p->post_modified,
				),
				$recent_posts
			),
			'comments' => array_map(
				fn( $c ) => array(
					'id'      => (int) $c->comment_ID,
					'post_id' => (int) $c->comment_post_ID,
					'author'  => $c->comment_author,
					'status'  => wp_get_comment_status( $c ),
					'date'    => $c->comment_date,
				),
				$recent_comments
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_woocommerce_stats(): array {
		$product_counts = wp_count_posts( 'product' );

		$order_counts = array();
		$statuses     = wc_get_order_statuses();
		foreach ( array_keys( $statuses ) as $status ) {
			$count = wc_orders_count( $status );
			if ( $count > 0 ) {
				$order_counts[ $status ] = $count;
			}
		}

		$low_stock          = wc_get_low_stock_amount();
		$low_stock_products = wc_get_products(
			array(
				'limit'        => -1,
				'stock_status' => 'lowstock',
				'return'       => 'ids',
			)
		);

		return array(
			'products'            => array(
				'total'   => (int) $product_counts->publish,
				'draft'   => (int) $product_counts->draft,
				'pending' => (int) $product_counts->pending,
			),
			'orders'              => $order_counts,
			'low_stock_count'     => count( $low_stock_products ),
			'low_stock_threshold' => $low_stock,
		);
	}
}
