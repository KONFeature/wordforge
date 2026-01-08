<?php
/**
 * Plugin Options Trait - Dynamic discovery of plugin options.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * Provides dynamic plugin option discovery with sensitive data filtering.
 */
trait PluginOptionsTrait {

	/**
	 * Patterns that indicate sensitive options (case-insensitive).
	 *
	 * @var array<string>
	 */
	private static array $sensitive_patterns = array(
		'password',
		'passwd',
		'secret',
		'api_key',
		'apikey',
		'api-key',
		'token',
		'auth',
		'credential',
		'private_key',
		'privatekey',
		'private-key',
		'hash',
		'salt',
		'nonce',
		'session',
		'transient',
		'cache',
		'license',
		'licence',
		'webhook_secret',
		'signing_secret',
		'encryption',
		'decrypt',
		'encrypt',
		'oauth',
		'bearer',
		'jwt',
		'access_key',
		'accesskey',
		'consumer_key',
		'consumer_secret',
	);

	/**
	 * Plugin option prefixes for discovery.
	 * Key = plugin slug, Value = SQL LIKE pattern.
	 *
	 * @var array<string, array{prefix: string, check: callable|null}>
	 */
	private static array $plugin_prefixes = array(
		'woocommerce'    => array(
			'prefix' => 'woocommerce_%',
			'check'  => 'is_woocommerce_active',
		),
		'yoast'          => array(
			'prefix' => 'wpseo%',
			'check'  => null,
		),
		'jetpack'        => array(
			'prefix' => 'jetpack_%',
			'check'  => null,
		),
		'acf'            => array(
			'prefix' => 'acf_%',
			'check'  => null,
		),
		'elementor'      => array(
			'prefix' => 'elementor%',
			'check'  => null,
		),
		'wpforms'        => array(
			'prefix' => 'wpforms%',
			'check'  => null,
		),
		'gravityforms'   => array(
			'prefix' => 'gf_%',
			'check'  => null,
		),
		'mailchimp'      => array(
			'prefix' => 'mc4wp_%',
			'check'  => null,
		),
		'updraftplus'    => array(
			'prefix' => 'updraft_%',
			'check'  => null,
		),
		'wordfence'      => array(
			'prefix' => 'wordfence%',
			'check'  => null,
		),
		'rank_math'      => array(
			'prefix' => 'rank_math_%',
			'check'  => null,
		),
		'w3_total_cache' => array(
			'prefix' => 'w3tc_%',
			'check'  => null,
		),
	);

	/**
	 * Check if an option name contains sensitive patterns.
	 *
	 * @param string $option_name The option name to check.
	 * @return bool True if sensitive, false if safe.
	 */
	private function is_sensitive_option( string $option_name ): bool {
		$lower_name = strtolower( $option_name );

		foreach ( self::$sensitive_patterns as $pattern ) {
			if ( false !== strpos( $lower_name, $pattern ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Discover options for a specific plugin prefix.
	 *
	 * @param string $prefix SQL LIKE pattern (e.g., 'woocommerce_%').
	 * @return array<string> List of safe option names.
	 */
	private function discover_options_by_prefix( string $prefix ): array {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Caching handled at ability layer via CacheableTrait.
		$options = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s AND autoload != 'no' LIMIT 500",
				$prefix
			)
		);

		if ( ! is_array( $options ) ) {
			return array();
		}

		return array_values(
			array_filter(
				$options,
				fn( $opt ) => ! $this->is_sensitive_option( $opt )
			)
		);
	}

	/**
	 * Discover all plugin options grouped by plugin slug.
	 *
	 * @return array<string, array<string>> Plugin slug => list of safe option names.
	 */
	private function discover_all_plugin_options(): array {
		$result = array();

		foreach ( self::$plugin_prefixes as $slug => $config ) {
			if ( null !== $config['check'] && function_exists( $config['check'] ) ) {
				$check_fn = $config['check'];
				if ( ! $check_fn() ) {
					continue;
				}
			}

			$options = $this->discover_options_by_prefix( $config['prefix'] );

			if ( ! empty( $options ) ) {
				$result[ $slug ] = $options;
			}
		}

		return $result;
	}

	/**
	 * Get a flat list of all discovered plugin options.
	 *
	 * @return array<string> All safe plugin option names.
	 */
	private function get_all_plugin_option_names(): array {
		$grouped = $this->discover_all_plugin_options();
		$flat    = array();

		foreach ( $grouped as $options ) {
			$flat = array_merge( $flat, $options );
		}

		return array_unique( $flat );
	}

	/**
	 * Infer option type from its current value.
	 *
	 * @param string $option_name The option name.
	 * @return string Type hint: 'string', 'int', 'bool', 'array'.
	 */
	private function infer_option_type( string $option_name ): string {
		$value = get_option( $option_name );

		if ( is_array( $value ) ) {
			return 'array';
		}

		if ( is_bool( $value ) ) {
			return 'bool';
		}

		if ( is_numeric( $value ) && ! is_string( $value ) ) {
			return 'int';
		}

		if ( in_array( $value, array( 'yes', 'no', '1', '0', 'true', 'false' ), true ) ) {
			return 'bool';
		}

		return 'string';
	}
}
