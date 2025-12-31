<?php
/**
 * Provider configuration management for OpenCode.
 *
 * Handles API key storage with encryption and provider configuration.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

/**
 * Manages AI provider configurations and API keys.
 */
class ProviderConfig {

	/**
	 * Supported providers with their metadata for API key configuration.
	 * Model lists are fetched from OpenCode at runtime, not hardcoded here.
	 */
	public const PROVIDERS = [
		'openai'    => [
			'id'        => 'openai',
			'name'      => 'OpenAI',
			'help_url'  => 'https://platform.openai.com/api-keys',
			'help_text' => 'Sign up at platform.openai.com, then create an API key.',
		],
		'anthropic' => [
			'id'        => 'anthropic',
			'name'      => 'Anthropic',
			'help_url'  => 'https://console.anthropic.com/',
			'help_text' => 'Sign up at console.anthropic.com, then create an API key.',
		],
		'google'    => [
			'id'        => 'google',
			'name'      => 'Google AI',
			'help_url'  => 'https://aistudio.google.com/',
			'help_text' => 'Sign in at aistudio.google.com, then click "Get API Key".',
		],
	];

	private const OPTION_KEY = 'wordforge_provider_keys';

	/**
	 * Encrypt an API key for storage.
	 *
	 * @param string $key The API key to encrypt.
	 * @return string The encrypted key.
	 */
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

	/**
	 * Decrypt an API key from storage.
	 *
	 * @param string $encrypted The encrypted API key.
	 * @return string The decrypted key.
	 */
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

	/**
	 * Mask an API key for display (show first 3 and last 4 chars).
	 *
	 * @param string $key The API key to mask.
	 * @return string The masked key.
	 */
	public static function mask_api_key( string $key ): string {
		if ( strlen( $key ) < 10 ) {
			return '••••••••';
		}

		return substr( $key, 0, 3 ) . '••••••••' . substr( $key, -4 );
	}

	/**
	 * Get all stored provider configurations.
	 *
	 * @return array<string, array{api_key: string}> Provider configurations with decrypted keys.
	 */
	public static function get_all_providers(): array {
		$stored = get_option( self::OPTION_KEY, [] );

		if ( ! is_array( $stored ) ) {
			return [];
		}

		$providers = [];
		foreach ( $stored as $provider_id => $config ) {
			if ( isset( $config['api_key'] ) && ! empty( $config['api_key'] ) ) {
				$providers[ $provider_id ] = [
					'api_key' => self::decrypt_api_key( $config['api_key'] ),
				];
			}
		}

		return $providers;
	}

	/**
	 * Get provider configuration for display (with masked keys).
	 *
	 * @return array Provider list with metadata and masked keys.
	 */
	public static function get_providers_for_display(): array {
		$stored   = get_option( self::OPTION_KEY, [] );
		$result   = [];

		foreach ( self::PROVIDERS as $provider_id => $meta ) {
			$has_key     = isset( $stored[ $provider_id ]['api_key'] ) && ! empty( $stored[ $provider_id ]['api_key'] );
			$decrypted   = $has_key ? self::decrypt_api_key( $stored[ $provider_id ]['api_key'] ) : '';

			$result[] = [
				'id'             => $provider_id,
				'name'           => $meta['name'],
				'configured'     => $has_key && ! empty( $decrypted ),
				'api_key_masked' => $has_key && ! empty( $decrypted ) ? self::mask_api_key( $decrypted ) : null,
				'help_url'       => $meta['help_url'],
				'help_text'      => $meta['help_text'],
			];
		}

		return $result;
	}

	/**
	 * Save an API key for a provider.
	 *
	 * @param string $provider_id The provider ID (openai, anthropic, google).
	 * @param string $api_key     The API key to store.
	 * @return bool Whether the save was successful.
	 */
	public static function save_provider_key( string $provider_id, string $api_key ): bool {
		if ( ! isset( self::PROVIDERS[ $provider_id ] ) ) {
			return false;
		}

		$stored = get_option( self::OPTION_KEY, [] );

		if ( ! is_array( $stored ) ) {
			$stored = [];
		}

		if ( empty( $api_key ) ) {
			unset( $stored[ $provider_id ] );
		} else {
			$stored[ $provider_id ] = [
				'api_key' => self::encrypt_api_key( $api_key ),
			];
		}

		return update_option( self::OPTION_KEY, $stored, false );
	}

	/**
	 * Remove a provider's API key.
	 *
	 * @param string $provider_id The provider ID to remove.
	 * @return bool Whether the removal was successful.
	 */
	public static function remove_provider_key( string $provider_id ): bool {
		return self::save_provider_key( $provider_id, '' );
	}

	/**
	 * Get configured providers list (IDs only).
	 *
	 * @return string[] List of provider IDs that have API keys configured.
	 */
	public static function get_configured_provider_ids(): array {
		$providers = self::get_all_providers();
		return array_keys( array_filter( $providers, fn( $p ) => ! empty( $p['api_key'] ) ) );
	}

	/**
	 * Check if a specific provider is configured.
	 *
	 * @param string $provider_id The provider ID to check.
	 * @return bool Whether the provider has an API key configured.
	 */
	public static function is_provider_configured( string $provider_id ): bool {
		$providers = self::get_all_providers();
		return isset( $providers[ $provider_id ] ) && ! empty( $providers[ $provider_id ]['api_key'] );
	}



	/**
	 * Get provider config for OpenCode server configuration.
	 *
	 * @return array Provider configuration for opencode.json.
	 */
	public static function get_opencode_provider_config(): array {
		$providers  = self::get_all_providers();
		$config     = [];

		foreach ( $providers as $provider_id => $provider_config ) {
			if ( empty( $provider_config['api_key'] ) ) {
				continue;
			}

			$config[ $provider_id ] = [
				'options' => [
					'apiKey' => $provider_config['api_key'],
				],
			];
		}

		return $config;
	}
}
