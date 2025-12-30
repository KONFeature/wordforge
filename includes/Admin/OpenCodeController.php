<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ServerProcess;
use WordForge\OpenCode\ProviderKeyStorage;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class OpenCodeController {

	private const NAMESPACE = 'wordforge/v1';

	public function __construct() {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/opencode/status',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'get_status' ],
				'permission_callback' => [ $this, 'check_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/download',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'download_binary' ],
				'permission_callback' => [ $this, 'check_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/start',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'start_server' ],
				'permission_callback' => [ $this, 'check_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/stop',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'stop_server' ],
				'permission_callback' => [ $this, 'check_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/cleanup',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'cleanup' ],
				'permission_callback' => [ $this, 'check_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/providers',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'get_providers' ],
				'permission_callback' => [ $this, 'check_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/providers/(?P<provider>[a-z]+)',
			[
				[
					'methods'             => 'PUT',
					'callback'            => [ $this, 'save_provider' ],
					'permission_callback' => [ $this, 'check_permission' ],
					'args'                => [
						'provider' => [
							'required'          => true,
							'validate_callback' => function ( $param ) {
								return array_key_exists( $param, ProviderKeyStorage::get_supported_providers() );
							},
						],
						'key'      => [
							'required' => true,
							'type'     => 'string',
						],
						'model'    => [
							'required' => false,
							'type'     => 'string',
						],
					],
				],
				[
					'methods'             => 'DELETE',
					'callback'            => [ $this, 'delete_provider' ],
					'permission_callback' => [ $this, 'check_permission' ],
					'args'                => [
						'provider' => [
							'required'          => true,
							'validate_callback' => function ( $param ) {
								return array_key_exists( $param, ProviderKeyStorage::get_supported_providers() );
							},
						],
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/session-token',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'create_session_token' ],
				'permission_callback' => [ $this, 'check_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/proxy/(?P<path>.*)',
			[
				'methods'             => [ 'GET', 'POST', 'PUT', 'DELETE', 'PATCH' ],
				'callback'            => [ $this, 'proxy_to_opencode' ],
				'permission_callback' => [ $this, 'check_permission' ],
				'args'                => [
					'path' => [
						'required' => false,
						'default'  => '',
					],
				],
			]
		);
	}

	public function check_permission(): bool {
		return current_user_can( 'manage_options' );
	}

	public function get_status(): WP_REST_Response {
		$binary_status = BinaryManager::get_platform_info();
		$server_status = ServerProcess::get_status();
		$update_info   = BinaryManager::check_for_update();

		return new WP_REST_Response( [
			'binary'  => $binary_status,
			'server'  => $server_status,
			'update'  => is_wp_error( $update_info ) ? null : $update_info,
			'hasKeys' => ProviderKeyStorage::has_any_key(),
		] );
	}

	public function download_binary(): WP_REST_Response {
		set_time_limit( 300 );

		$result = BinaryManager::download_latest();

		if ( is_wp_error( $result ) ) {
			return new WP_REST_Response(
				[ 'error' => $result->get_error_message() ],
				500
			);
		}

		return new WP_REST_Response( [
			'success' => true,
			'version' => BinaryManager::get_installed_version(),
			'binary'  => BinaryManager::get_platform_info(),
		] );
	}

	public function start_server(): WP_REST_Response {
		if ( ! BinaryManager::is_installed() ) {
			return new WP_REST_Response(
				[ 'error' => 'OpenCode binary not installed. Please download first.' ],
				400
			);
		}

		$token  = $this->generate_mcp_auth_token();
		$result = ServerProcess::start( [
			'providers'      => ProviderKeyStorage::build_opencode_provider_config(),
			'mcp_auth_token' => $token,
		] );

		if ( ! $result['success'] ) {
			return new WP_REST_Response(
				[ 'error' => $result['error'] ?? 'Failed to start server' ],
				500
			);
		}

		return new WP_REST_Response( [
			'success' => true,
			'url'     => $result['url'],
			'port'    => $result['port'],
			'version' => $result['version'] ?? null,
			'status'  => $result['status'],
		] );
	}

	public function stop_server(): WP_REST_Response {
		ServerProcess::stop();

		return new WP_REST_Response( [
			'success' => true,
			'server'  => ServerProcess::get_status(),
		] );
	}

	public function cleanup(): WP_REST_Response {
		ServerProcess::stop();
		BinaryManager::cleanup();

		return new WP_REST_Response( [
			'success' => true,
			'binary'  => BinaryManager::get_platform_info(),
			'server'  => ServerProcess::get_status(),
		] );
	}

	public function get_providers(): WP_REST_Response {
		$supported = ProviderKeyStorage::get_supported_providers();
		$configured = [];

		foreach ( $supported as $id => $info ) {
			$key   = ProviderKeyStorage::get_key( $id );
			$model = ProviderKeyStorage::get_model( $id );

			$configured[ $id ] = [
				'id'         => $id,
				'name'       => $info['name'],
				'models'     => $info['models'],
				'configured' => ! empty( $key ),
				'maskedKey'  => $key ? ProviderKeyStorage::mask_key( $key ) : null,
				'model'      => $model,
			];
		}

		return new WP_REST_Response( [
			'providers'   => $configured,
			'hasAnyKey'   => ProviderKeyStorage::has_any_key(),
			'useOpenCode' => ! ProviderKeyStorage::has_any_key(),
		] );
	}

	public function save_provider( WP_REST_Request $request ): WP_REST_Response {
		$provider = $request->get_param( 'provider' );
		$key      = $request->get_param( 'key' );
		$model    = $request->get_param( 'model' );

		$success = ProviderKeyStorage::set_key( $provider, $key, $model );

		if ( ! $success ) {
			return new WP_REST_Response(
				[ 'error' => 'Failed to save provider key' ],
				500
			);
		}

		return new WP_REST_Response( [
			'success'  => true,
			'provider' => $provider,
		] );
	}

	public function delete_provider( WP_REST_Request $request ): WP_REST_Response {
		$provider = $request->get_param( 'provider' );

		ProviderKeyStorage::delete_key( $provider );

		return new WP_REST_Response( [
			'success'  => true,
			'provider' => $provider,
		] );
	}

	public function create_session_token(): WP_REST_Response {
		$token = $this->generate_mcp_auth_token();

		return new WP_REST_Response( [
			'token'     => $token,
			'expiresIn' => 3600,
		] );
	}

	private function generate_mcp_auth_token(): string {
		$user = wp_get_current_user();
		$time = time();
		$data = [
			'user_id' => $user->ID,
			'exp'     => $time + 3600,
			'iat'     => $time,
		];

		$payload   = base64_encode( wp_json_encode( $data ) );
		$signature = hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );

		return $payload . '.' . $signature;
	}

	public static function verify_mcp_auth_token( string $token ): ?int {
		$parts = explode( '.', $token );

		if ( count( $parts ) !== 2 ) {
			return null;
		}

		[ $payload, $signature ] = $parts;

		$expected = hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );

		if ( ! hash_equals( $expected, $signature ) ) {
			return null;
		}

		$data = json_decode( base64_decode( $payload ), true );

		if ( ! $data || empty( $data['user_id'] ) || empty( $data['exp'] ) ) {
			return null;
		}

		if ( $data['exp'] < time() ) {
			return null;
		}

		return (int) $data['user_id'];
	}

	public function proxy_to_opencode( WP_REST_Request $request ): WP_REST_Response {
		$server_url = ServerProcess::get_server_url();

		if ( ! $server_url ) {
			return new WP_REST_Response(
				[ 'error' => 'OpenCode server is not running' ],
				503
			);
		}

		$path   = $request->get_param( 'path' ) ?: '';
		$method = $request->get_method();
		$body   = $request->get_body();

		$target_url = rtrim( $server_url, '/' ) . '/' . ltrim( $path, '/' );

		$args = [
			'method'  => $method,
			'timeout' => 60,
			'headers' => [
				'Content-Type' => 'application/json',
				'Accept'       => 'text/html, application/json, */*',
			],
		];

		if ( in_array( $method, [ 'POST', 'PUT', 'PATCH' ], true ) && $body ) {
			$args['body'] = $body;
		}

		$response = wp_remote_request( $target_url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_REST_Response(
				[ 'error' => 'Proxy error: ' . $response->get_error_message() ],
				502
			);
		}

		$status_code  = wp_remote_retrieve_response_code( $response );
		$content_type = wp_remote_retrieve_header( $response, 'content-type' );
		$body         = wp_remote_retrieve_body( $response );

		$wp_response = new WP_REST_Response();
		$wp_response->set_status( $status_code );

		if ( str_contains( $content_type, 'text/html' ) ) {
			$wp_response->set_data( [ 'html' => $body ] );
			$wp_response->header( 'X-WordForge-Content-Type', 'text/html' );
		} elseif ( str_contains( $content_type, 'application/json' ) ) {
			$wp_response->set_data( json_decode( $body, true ) );
		} else {
			$wp_response->set_data( [ 'raw' => $body ] );
		}

		return $wp_response;
	}

	public static function get_opencode_admin_url(): string {
		return admin_url( 'admin.php?page=wordforge-opencode' );
	}
}
