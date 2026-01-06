<?php
declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\AgentConfig;
use WordForge\OpenCode\ConfigChangeDetector;
use WordForge\OpenCode\ContextProvider;
use WordForge\OpenCode\ProviderConfig;
use WP_REST_Request;
use WP_REST_Response;

class DesktopConnectionController {

	private const NAMESPACE        = 'wordforge/v1';
	private const TRANSIENT_PREFIX = 'wordforge_desktop_token_';
	private const TOKEN_EXPIRY     = 300;

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/desktop/connect-token',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'generate_connect_token' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/desktop/exchange',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'exchange_token' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'token' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/desktop/config',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_config' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/desktop/connect-url',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_connect_url' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/desktop/config-hash',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_config_hash' ),
				'permission_callback' => array( $this, 'check_app_password_permission' ),
			)
		);
	}

	public function check_admin_permission(): bool {
		return current_user_can( 'manage_options' );
	}

	public function check_app_password_permission(): bool {
		return is_user_logged_in() && current_user_can( 'manage_options' );
	}

	public function generate_connect_token(): WP_REST_Response {
		$user = wp_get_current_user();
		if ( ! $user || ! $user->ID ) {
			return new WP_REST_Response(
				array( 'error' => 'User not authenticated' ),
				401
			);
		}

		$token      = wp_generate_password( 32, false, false );
		$token_data = array(
			'user_id'    => $user->ID,
			'created_at' => time(),
			'site_url'   => get_site_url(),
			'site_name'  => get_bloginfo( 'name' ),
		);

		set_transient( self::TRANSIENT_PREFIX . $token, $token_data, self::TOKEN_EXPIRY );

		$connect_url = $this->build_connect_url( $token );

		return new WP_REST_Response(
			array(
				'token'      => $token,
				'connectUrl' => $connect_url,
				'expiresIn'  => self::TOKEN_EXPIRY,
				'siteName'   => $token_data['site_name'],
				'siteUrl'    => $token_data['site_url'],
			)
		);
	}

	public function exchange_token( WP_REST_Request $request ): WP_REST_Response {
		$token = $request->get_param( 'token' );

		if ( empty( $token ) ) {
			return new WP_REST_Response(
				array( 'error' => 'Token is required' ),
				400
			);
		}

		$token_data = get_transient( self::TRANSIENT_PREFIX . $token );

		if ( ! $token_data ) {
			return new WP_REST_Response(
				array( 'error' => 'Invalid or expired token' ),
				401
			);
		}

		delete_transient( self::TRANSIENT_PREFIX . $token );

		$user = get_user_by( 'id', $token_data['user_id'] );
		if ( ! $user ) {
			return new WP_REST_Response(
				array( 'error' => 'User not found' ),
				404
			);
		}

		wp_set_current_user( $user->ID );

		$app_password = $this->create_desktop_app_password( $user );

		if ( ! $app_password ) {
			return new WP_REST_Response(
				array( 'error' => 'Failed to create application password' ),
				500
			);
		}

		return new WP_REST_Response(
			array(
				'success'     => true,
				'credentials' => array(
					'username'    => $user->user_login,
					'appPassword' => $app_password['password'],
					'auth'        => $app_password['auth'],
				),
				'site'        => array(
					'name'         => get_bloginfo( 'name' ),
					'url'          => get_site_url(),
					'restUrl'      => rest_url(),
					'mcpEndpoint'  => \WordForge\get_endpoint_url(),
					'abilitiesUrl' => rest_url( 'wp-abilities/v1' ),
				),
			)
		);
	}

	public function get_config(): WP_REST_Response {
		$config = array(
			'agents'    => AgentConfig::get_agents_for_display(),
			'providers' => ProviderConfig::get_configured_providers(),
			'context'   => ContextProvider::get_global_context(),
			'site'      => array(
				'name'        => get_bloginfo( 'name' ),
				'url'         => get_site_url(),
				'mcpEndpoint' => \WordForge\get_endpoint_url(),
			),
		);

		return new WP_REST_Response( $config );
	}

	public function get_connect_url(): WP_REST_Response {
		$response = $this->generate_connect_token();
		$data     = $response->get_data();

		if ( isset( $data['error'] ) ) {
			return $response;
		}

		return new WP_REST_Response(
			array(
				'connectUrl' => $data['connectUrl'],
				'token'      => $data['token'],
				'expiresIn'  => $data['expiresIn'],
			)
		);
	}

	private function build_connect_url( string $token ): string {
		$params = array(
			'token' => $token,
			'site'  => get_site_url(),
			'name'  => rawurlencode( get_bloginfo( 'name' ) ),
		);

		return 'wordforge://connect?' . http_build_query( $params );
	}

	/**
	 * @return array{password: string, auth: string, uuid: string}|null
	 */
	private function create_desktop_app_password( \WP_User $user ): ?array {
		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			return null;
		}

		$app_name = 'WordForge Desktop - ' . wp_date( 'Y-m-d H:i' );

		$result = \WP_Application_Passwords::create_new_application_password(
			$user->ID,
			array( 'name' => $app_name )
		);

		if ( is_wp_error( $result ) ) {
			return null;
		}

		[ $password, $item ] = $result;

		$auth = base64_encode( $user->user_login . ':' . $password );

		return array(
			'password' => $password,
			'auth'     => $auth,
			'uuid'     => $item['uuid'],
		);
	}

	public function get_config_hash(): WP_REST_Response {
		$hash_data = ConfigChangeDetector::get_config_hash();

		return new WP_REST_Response( $hash_data );
	}
}
