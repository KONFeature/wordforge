<?php
/**
 * Provider API key storage for OpenCode.
 *
 * Handles encrypted API key storage. Provider metadata (names, help URLs)
 * is managed by the frontend - this class only stores/retrieves keys.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class ProviderConfig {

	private const OPTION_KEY = 'wordforge_provider_keys';

	public static function encrypt_api_key( string $key ): string {
		if ( empty( $key ) ) {
			return '';
		}

		$salt   = wp_salt( 'auth' );
		$method = 'AES-256-CBC';
		$ivlen  = openssl_cipher_iv_length( $method );
		$iv     = openssl_random_pseudo_bytes( $ivlen );

		$encrypted = openssl_encrypt( $key, $method, $salt, OPENSSL_RAW_DATA, $iv );

		return base64_encode( $iv . $encrypted );
	}

	public static function decrypt_api_key( string $encrypted ): string {
		if ( empty( $encrypted ) ) {
			return '';
		}

		$salt   = wp_salt( 'auth' );
		$method = 'AES-256-CBC';
		$ivlen  = openssl_cipher_iv_length( $method );

		$data = base64_decode( $encrypted );
		if ( false === $data || strlen( $data ) <= $ivlen ) {
			return '';
		}

		$iv        = substr( $data, 0, $ivlen );
		$encrypted = substr( $data, $ivlen );

		$decrypted = openssl_decrypt( $encrypted, $method, $salt, OPENSSL_RAW_DATA, $iv );

		return false === $decrypted ? '' : $decrypted;
	}

	public static function mask_api_key( string $key ): string {
		if ( strlen( $key ) < 10 ) {
			return '••••••••';
		}

		return substr( $key, 0, 3 ) . '••••••••' . substr( $key, -4 );
	}

	/**
	 * Get all stored provider API keys (decrypted).
	 *
	 * @return array<string, string> Provider ID => decrypted API key
	 */
	public static function get_all_keys(): array {
		$stored = get_option( self::OPTION_KEY, array() );

		if ( ! is_array( $stored ) ) {
			return array();
		}

		$keys = array();
		foreach ( $stored as $provider_id => $config ) {
			if ( isset( $config['api_key'] ) && ! empty( $config['api_key'] ) ) {
				$decrypted = self::decrypt_api_key( $config['api_key'] );
				if ( ! empty( $decrypted ) ) {
					$keys[ $provider_id ] = $decrypted;
				}
			}
		}

		return $keys;
	}

	/**
	 * Get configured providers with masked keys for display.
	 *
	 * @return array<string, array{configured: bool, api_key_masked: string|null}>
	 */
	public static function get_configured_providers(): array {
		$stored = get_option( self::OPTION_KEY, array() );

		if ( ! is_array( $stored ) ) {
			return array();
		}

		$result = array();
		foreach ( $stored as $provider_id => $config ) {
			if ( isset( $config['api_key'] ) && ! empty( $config['api_key'] ) ) {
				$decrypted = self::decrypt_api_key( $config['api_key'] );
				if ( ! empty( $decrypted ) ) {
					$result[ $provider_id ] = array(
						'configured'     => true,
						'api_key_masked' => self::mask_api_key( $decrypted ),
					);
				}
			}
		}

		return $result;
	}

	public static function save_provider_key( string $provider_id, string $api_key ): bool {
		$provider_id = sanitize_key( $provider_id );
		if ( empty( $provider_id ) ) {
			return false;
		}

		$stored = get_option( self::OPTION_KEY, array() );

		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		if ( empty( $api_key ) ) {
			unset( $stored[ $provider_id ] );
		} else {
			$stored[ $provider_id ] = array(
				'api_key' => self::encrypt_api_key( $api_key ),
			);
		}

		return update_option( self::OPTION_KEY, $stored, false );
	}

	public static function remove_provider_key( string $provider_id ): bool {
		return self::save_provider_key( $provider_id, '' );
	}

	/**
	 * @return string[] List of provider IDs that have API keys configured.
	 */
	public static function get_configured_provider_ids(): array {
		return array_keys( self::get_all_keys() );
	}

	public static function is_provider_configured( string $provider_id ): bool {
		$keys = self::get_all_keys();
		return isset( $keys[ $provider_id ] ) && ! empty( $keys[ $provider_id ] );
	}

	/**
	 * Get provider config for OpenCode server configuration.
	 *
	 * @return array Provider configuration for opencode.json.
	 */
	public static function get_opencode_provider_config(): array {
		$keys   = self::get_all_keys();
		$config = array();

		foreach ( $keys as $provider_id => $api_key ) {
			$config[ $provider_id ] = array(
				'options' => array(
					'apiKey' => $api_key,
				),
			);
		}

		return $config;
	}
}
