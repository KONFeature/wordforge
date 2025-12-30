<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class ProviderKeyStorage {

	private const OPTION_NAME = 'wordforge_provider_keys';

	private const SUPPORTED_PROVIDERS = [
		'anthropic' => [
			'name'        => 'Anthropic (Claude)',
			'key_prefix'  => 'sk-ant-',
			'models'      => [ 'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022' ],
		],
		'google'    => [
			'name'        => 'Google (Gemini)',
			'key_prefix'  => 'AI',
			'models'      => [ 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash' ],
		],
	];

	public static function get_supported_providers(): array {
		return self::SUPPORTED_PROVIDERS;
	}

	public static function get_all_keys(): array {
		$encrypted = get_option( self::OPTION_NAME, [] );
		$decrypted = [];

		foreach ( $encrypted as $provider => $data ) {
			if ( isset( $data['key'] ) ) {
				$decrypted[ $provider ] = [
					'key'   => self::decrypt( $data['key'] ),
					'model' => $data['model'] ?? null,
				];
			}
		}

		return $decrypted;
	}

	public static function get_key( string $provider ): ?string {
		$keys = self::get_all_keys();
		return $keys[ $provider ]['key'] ?? null;
	}

	public static function get_model( string $provider ): ?string {
		$keys = self::get_all_keys();
		return $keys[ $provider ]['model'] ?? null;
	}

	public static function set_key( string $provider, string $key, ?string $model = null ): bool {
		if ( ! isset( self::SUPPORTED_PROVIDERS[ $provider ] ) ) {
			return false;
		}

		$encrypted            = get_option( self::OPTION_NAME, [] );
		$encrypted[ $provider ] = [
			'key'   => self::encrypt( $key ),
			'model' => $model,
		];

		return update_option( self::OPTION_NAME, $encrypted );
	}

	public static function delete_key( string $provider ): bool {
		$encrypted = get_option( self::OPTION_NAME, [] );

		if ( ! isset( $encrypted[ $provider ] ) ) {
			return true;
		}

		unset( $encrypted[ $provider ] );
		return update_option( self::OPTION_NAME, $encrypted );
	}

	public static function has_any_key(): bool {
		$keys = self::get_all_keys();

		foreach ( $keys as $data ) {
			if ( ! empty( $data['key'] ) ) {
				return true;
			}
		}

		return false;
	}

	public static function build_opencode_provider_config(): array {
		$config = [];
		$keys   = self::get_all_keys();

		foreach ( $keys as $provider => $data ) {
			if ( empty( $data['key'] ) ) {
				continue;
			}

			$config[ $provider ] = [ 'apiKey' => $data['key'] ];

			if ( ! empty( $data['model'] ) ) {
				$config[ $provider ]['model'] = $data['model'];
			}
		}

		return $config;
	}

	public static function mask_key( string $key ): string {
		if ( strlen( $key ) <= 12 ) {
			return str_repeat( '*', strlen( $key ) );
		}

		return substr( $key, 0, 8 ) . str_repeat( '*', strlen( $key ) - 12 ) . substr( $key, -4 );
	}

	private static function encrypt( string $value ): string {
		$key = self::get_encryption_key();

		if ( function_exists( 'openssl_encrypt' ) ) {
			$iv         = random_bytes( 16 );
			$encrypted  = openssl_encrypt( $value, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv );
			return base64_encode( $iv . $encrypted );
		}

		return base64_encode( $value ^ str_repeat( $key, (int) ceil( strlen( $value ) / strlen( $key ) ) ) );
	}

	private static function decrypt( string $value ): string {
		$key     = self::get_encryption_key();
		$decoded = base64_decode( $value );

		if ( function_exists( 'openssl_decrypt' ) && strlen( $decoded ) > 16 ) {
			$iv        = substr( $decoded, 0, 16 );
			$encrypted = substr( $decoded, 16 );
			$decrypted = openssl_decrypt( $encrypted, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv );

			if ( false !== $decrypted ) {
				return $decrypted;
			}
		}

		return (string) ( $decoded ^ str_repeat( $key, (int) ceil( strlen( $decoded ) / strlen( $key ) ) ) );
	}

	private static function get_encryption_key(): string {
		if ( defined( 'AUTH_KEY' ) && strlen( AUTH_KEY ) >= 32 ) {
			return substr( AUTH_KEY, 0, 32 );
		}

		$stored_key = get_option( 'wordforge_encryption_key' );

		if ( $stored_key && strlen( $stored_key ) >= 32 ) {
			return $stored_key;
		}

		$new_key = wp_generate_password( 32, true, true );
		update_option( 'wordforge_encryption_key', $new_key );

		return $new_key;
	}

	public static function delete_all(): bool {
		delete_option( self::OPTION_NAME );
		return true;
	}
}
