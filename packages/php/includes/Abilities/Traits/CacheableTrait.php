<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * @method array success( mixed $data, string $message = '' )
 */
trait CacheableTrait {

	/**
	 * @param string               $cache_key  Unique cache key for this data.
	 * @param callable             $data_fn    Function that returns data to cache.
	 * @param int                  $expiration Cache expiration in seconds (default 5 minutes).
	 * @param array<string, mixed> $args       Args to include in cache key hash.
	 * @return array<string, mixed>
	 */
	protected function cached_success(
		string $cache_key,
		callable $data_fn,
		int $expiration = 300,
		array $args = []
	): array {
		$full_key = $this->build_cache_key( $cache_key, $args );
		$cached = get_transient( $full_key );

		if ( false !== $cached ) {
			return $this->success( $cached );
		}

		$data = $data_fn();
		set_transient( $full_key, $data, $expiration );

		return $this->success( $data );
	}

	/**
	 * @param string               $cache_key Base cache key.
	 * @param array<string, mixed> $args      Args to hash.
	 * @return string
	 */
	protected function build_cache_key( string $cache_key, array $args = [] ): string {
		$key = 'wordforge_' . $cache_key;

		if ( ! empty( $args ) ) {
			ksort( $args );
			$key .= '_' . md5( wp_json_encode( $args ) );
		}

		return substr( $key, 0, 172 );
	}

	/**
	 * @param string $cache_key Base cache key to invalidate.
	 * @return void
	 */
	protected function invalidate_cache( string $cache_key ): void {
		global $wpdb;

		$pattern = '_transient_wordforge_' . $cache_key . '%';
		$transients = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
				$pattern
			)
		);

		foreach ( $transients as $transient ) {
			$name = str_replace( '_transient_', '', $transient );
			delete_transient( $name );
		}
	}

	/**
	 * @return void
	 */
	protected function invalidate_all_wordforge_cache(): void {
		global $wpdb;

		$transients = $wpdb->get_col(
			"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '_transient_wordforge_%'"
		);

		foreach ( $transients as $transient ) {
			$name = str_replace( '_transient_', '', $transient );
			delete_transient( $name );
		}
	}
}
