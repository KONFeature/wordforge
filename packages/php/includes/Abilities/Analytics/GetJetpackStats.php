<?php
/**
 * Get Jetpack Stats Ability - Retrieve Jetpack/WordPress.com traffic analytics.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Analytics;

use WordForge\Abilities\AbstractAbility;

class GetJetpackStats extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-analytics';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Jetpack Stats', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve Jetpack/WordPress.com traffic analytics including visitors, views, top posts, referrers, ' .
			'country views, clicks, search terms, and insights. Requires Jetpack to be connected to WordPress.com. ' .
			'Use resource parameter to fetch specific stats: stats (general), visits, insights, highlights, ' .
			'clicks, country-views, referrers, top-posts, search-terms.',
			'wordforge'
		);
	}

	public function get_capability(): string|array {
		return array( 'manage_options', 'view_stats' );
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'resource'   => array(
					'type'        => 'string',
					'description' => 'Type of stats to retrieve.',
					'enum'        => array(
						'stats',
						'visits',
						'insights',
						'highlights',
						'clicks',
						'country-views',
						'referrers',
						'top-posts',
						'search-terms',
						'top-authors',
						'tags',
						'publicize',
						'followers',
					),
					'default'     => 'stats',
				),
				'period'     => array(
					'type'        => 'string',
					'description' => 'Time period granularity for stats.',
					'enum'        => array( 'day', 'week', 'month', 'year' ),
					'default'     => 'day',
				),
				'num'        => array(
					'type'        => 'integer',
					'description' => 'Number of periods to return.',
					'minimum'     => 1,
					'maximum'     => 365,
					'default'     => 7,
				),
				'date'       => array(
					'type'        => 'string',
					'description' => 'End date for stats in YYYY-MM-DD format. Defaults to today.',
				),
				'max'        => array(
					'type'        => 'integer',
					'description' => 'Maximum number of results for list-type stats (top-posts, referrers, etc.).',
					'minimum'     => 1,
					'maximum'     => 100,
					'default'     => 10,
				),
				'unit'       => array(
					'type'        => 'string',
					'description' => 'Time unit for visits endpoint.',
					'enum'        => array( 'day', 'week', 'month', 'year' ),
					'default'     => 'day',
				),
				'quantity'   => array(
					'type'        => 'integer',
					'description' => 'Number of data points for visits endpoint.',
					'minimum'     => 1,
					'maximum'     => 365,
					'default'     => 30,
				),
				'summarize'  => array(
					'type'        => 'boolean',
					'description' => 'Return summarized stats instead of day-by-day breakdown.',
					'default'     => false,
				),
			),
		);
	}

	public function execute( array $args ): array {
		if ( ! $this->is_jetpack_stats_available() ) {
			return $this->error(
				'Jetpack Stats is not available. Please ensure Jetpack is installed, activated, and connected to WordPress.com.',
				'jetpack_not_available'
			);
		}

		$blog_id = $this->get_blog_id();
		if ( ! $blog_id ) {
			return $this->error(
				'Could not determine WordPress.com blog ID. Please ensure Jetpack is properly connected.',
				'no_blog_id'
			);
		}

		$resource = $args['resource'] ?? 'stats';
		$params   = $this->build_params( $args );

		$result = $this->fetch_stats( $resource, $params );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), $result->get_error_code() );
		}

		return $this->success(
			array(
				'blog_id'  => $blog_id,
				'resource' => $resource,
				'params'   => $params,
				'data'     => $result,
			)
		);
	}

	private function is_jetpack_stats_available(): bool {
		if ( ! class_exists( 'Automattic\Jetpack\Stats\WPCOM_Stats' ) ) {
			return false;
		}

		if ( ! function_exists( 'Jetpack_Options' ) && ! class_exists( 'Jetpack_Options' ) ) {
			return false;
		}

		return true;
	}

	private function get_blog_id(): ?int {
		if ( class_exists( 'Jetpack_Options' ) ) {
			$id = \Jetpack_Options::get_option( 'id' );
			return $id ? (int) $id : null;
		}
		return null;
	}

	/**
	 * @param array<string, mixed> $args
	 * @return array<string, mixed>
	 */
	private function build_params( array $args ): array {
		$params = array();

		$allowed_params = array( 'period', 'num', 'date', 'max', 'unit', 'quantity', 'summarize' );

		foreach ( $allowed_params as $key ) {
			if ( isset( $args[ $key ] ) ) {
				$params[ $key ] = $args[ $key ];
			}
		}

		return $params;
	}

	/**
	 * @param string               $resource
	 * @param array<string, mixed> $params
	 * @return mixed
	 */
	private function fetch_stats( string $resource, array $params ): mixed {
		$wpcom_stats = new \Automattic\Jetpack\Stats\WPCOM_Stats();

		switch ( $resource ) {
			case 'stats':
				return $wpcom_stats->get_stats( $params );

			case 'visits':
				return $wpcom_stats->get_visits( $params );

			case 'insights':
				return $wpcom_stats->get_insights( $params );

			case 'highlights':
				return $wpcom_stats->get_highlights( $params );

			case 'clicks':
				return $wpcom_stats->get_clicks( $params );

			case 'country-views':
				return $wpcom_stats->get_views_by_country( $params );

			case 'referrers':
				return $wpcom_stats->get_referrers( $params );

			case 'top-posts':
				return $wpcom_stats->get_top_posts( $params );

			case 'search-terms':
				return $wpcom_stats->get_search_terms( $params );

			case 'top-authors':
				return $wpcom_stats->get_top_authors( $params );

			case 'tags':
				return $wpcom_stats->get_tags( $params );

			case 'publicize':
				return $wpcom_stats->get_publicize_followers( $params );

			case 'followers':
				return $wpcom_stats->get_followers( $params );

			default:
				return new \WP_Error( 'invalid_resource', "Unknown stats resource: {$resource}" );
		}
	}
}
