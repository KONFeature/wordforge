<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class AppPasswordManager {

	private const OPTION_KEY = 'wordforge_app_password';

	/**
	 * @return array{username: string, password: string, auth: string}|null
	 */
	public static function get_or_create(): ?array {
		$user = wp_get_current_user();
		if ( ! $user || ! $user->ID ) {
			return null;
		}

		$stored = get_option( self::OPTION_KEY );
		if ( self::is_valid_stored( $stored, $user->ID ) ) {
			return [
				'username' => $user->user_login,
				'password' => $stored['password'],
				'auth'     => $stored['auth'],
			];
		}

		return self::create_new( $user );
	}

	public static function get_auth_string(): ?string {
		$data = self::get_or_create();
		return $data ? $data['auth'] : null;
	}

	public static function revoke(): bool {
		$stored = get_option( self::OPTION_KEY );
		if ( ! $stored || ! isset( $stored['uuid'] ) || ! isset( $stored['user_id'] ) ) {
			delete_option( self::OPTION_KEY );
			return true;
		}

		if ( class_exists( 'WP_Application_Passwords' ) ) {
			\WP_Application_Passwords::delete_application_password( $stored['user_id'], $stored['uuid'] );
		}

		delete_option( self::OPTION_KEY );
		return true;
	}

	private static function is_valid_stored( mixed $stored, int $user_id ): bool {
		return $stored
			&& isset( $stored['user_id'] )
			&& $stored['user_id'] === $user_id
			&& isset( $stored['auth'], $stored['password'] );
	}

	/**
	 * @return array{username: string, password: string, auth: string}|null
	 */
	private static function create_new( \WP_User $user ): ?array {
		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			return null;
		}

		$result = \WP_Application_Passwords::create_new_application_password(
			$user->ID,
			[ 'name' => 'WordForge OpenCode' ]
		);

		if ( is_wp_error( $result ) ) {
			error_log( 'WordForge: Failed to create app password: ' . $result->get_error_message() );
			return null;
		}

		[ $password, $item ] = $result;

		$auth = base64_encode( $user->user_login . ':' . $password );

		update_option( self::OPTION_KEY, [
			'user_id'  => $user->ID,
			'uuid'     => $item['uuid'],
			'auth'     => $auth,
			'password' => $password,
		], false );

		return [
			'username' => $user->user_login,
			'password' => $password,
			'auth'     => $auth,
		];
	}
}
