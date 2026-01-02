<?php
/**
 * Cacheable trait for WordPress abilities.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * @method array success( mixed $data, string $message = '' )
 */
trait CacheableTrait {

	/**
	 * @var string
	 */
	private static string $cache_group = 'wordforge';

	/**
	 * @var string
	 */
	private static string $cache_keys_option = 'wordforge_cache_keys';

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
		array $args = array()
	): array {
		$full_key = $this->build_cache_key( $cache_key, $args );

		$cached = wp_cache_get( $full_key, self::$cache_group );
		if ( false !== $cached ) {
			return $this->success( $cached );
		}

		$cached = get_transient( $full_key );
		if ( false !== $cached ) {
			wp_cache_set( $full_key, $cached, self::$cache_group, $expiration );
			return $this->success( $cached );
		}

		$data = $data_fn();

		wp_cache_set( $full_key, $data, self::$cache_group, $expiration );
		set_transient( $full_key, $data, $expiration );
		$this->track_cache_key( $cache_key, $full_key );

		return $this->success( $data );
	}

	/**
	 * @param string               $cache_key Base cache key.
	 * @param array<string, mixed> $args      Args to hash.
	 * @return string
	 */
	protected function build_cache_key( string $cache_key, array $args = array() ): string {
		$key = 'wordforge_' . $cache_key;

		if ( ! empty( $args ) ) {
			ksort( $args );
			$key .= '_' . md5( wp_json_encode( $args ) );
		}

		return substr( $key, 0, 172 );
	}

	/**
	 * @param string $base_key Base cache key.
	 * @param string $full_key Full cache key with hash.
	 * @return void
	 */
	private function track_cache_key( string $base_key, string $full_key ): void {
		$keys = get_option( self::$cache_keys_option, array() );

		if ( ! isset( $keys[ $base_key ] ) ) {
			$keys[ $base_key ] = array();
		}

		if ( count( $keys[ $base_key ] ) < 100 ) {
			$keys[ $base_key ][ $full_key ] = time();
			update_option( self::$cache_keys_option, $keys, false );
		}
	}

	/**
	 * @param string $cache_key Base cache key to invalidate.
	 * @return void
	 */
	protected function invalidate_cache( string $cache_key ): void {
		$keys = get_option( self::$cache_keys_option, array() );

		if ( isset( $keys[ $cache_key ] ) ) {
			foreach ( array_keys( $keys[ $cache_key ] ) as $full_key ) {
				wp_cache_delete( $full_key, self::$cache_group );
				delete_transient( $full_key );
			}

			unset( $keys[ $cache_key ] );
			update_option( self::$cache_keys_option, $keys, false );
		}
	}

	/**
	 * @return void
	 */
	protected function invalidate_all_wordforge_cache(): void {
		$keys = get_option( self::$cache_keys_option, array() );

		foreach ( $keys as $full_keys ) {
			foreach ( array_keys( $full_keys ) as $full_key ) {
				wp_cache_delete( $full_key, self::$cache_group );
				delete_transient( $full_key );
			}
		}

		delete_option( self::$cache_keys_option );

		if ( function_exists( 'wp_cache_flush_group' ) ) {
			wp_cache_flush_group( self::$cache_group );
		}
	}
}
