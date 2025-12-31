<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\ServerProcess;
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
			'/opencode/refresh',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'refresh_context' ],
				'permission_callback' => [ $this, 'check_permission' ],
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
				'methods'             => [ 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS' ],
				'callback'            => [ $this, 'proxy_to_opencode' ],
				'permission_callback' => [ $this, 'check_proxy_permission' ],
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

	public function check_proxy_permission( WP_REST_Request $request ): bool {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}

		$token = $request->get_param( '_wf_token' );
		if ( $token ) {
			$user_id = self::verify_mcp_auth_token( $token );
			if ( $user_id ) {
				$user = get_user_by( 'id', $user_id );
				if ( $user && user_can( $user, 'manage_options' ) ) {
					return true;
				}
			}
		}

		return false;
	}

	public function get_status(): WP_REST_Response {
		$binary_status = BinaryManager::get_platform_info();
		$server_status = ServerProcess::get_status();
		$update_info   = BinaryManager::check_for_update();

		return new WP_REST_Response( [
			'binary' => $binary_status,
			'server' => $server_status,
			'update' => is_wp_error( $update_info ) ? null : $update_info,
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

	public function refresh_context(): WP_REST_Response {
		ServerProcess::stop();
		usleep( 500000 );

		$token  = $this->generate_mcp_auth_token();
		$result = ServerProcess::start( [
			'mcp_auth_token' => $token,
		] );

		if ( ! $result['success'] ) {
			return new WP_REST_Response(
				[ 'error' => $result['error'] ?? 'Failed to restart server' ],
				500
			);
		}

		return new WP_REST_Response( [
			'success' => true,
			'message' => 'WordPress context refreshed',
			'url'     => $result['url'],
			'port'    => $result['port'],
			'version' => $result['version'] ?? null,
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

	public function proxy_to_opencode( WP_REST_Request $request ): void {
		$this->send_cors_headers();

		$method = $request->get_method();
		if ( 'OPTIONS' === $method ) {
			status_header( 204 );
			exit;
		}

		$server_url = ServerProcess::get_server_url();

		if ( ! $server_url ) {
			status_header( 503 );
			header( 'Content-Type: application/json' );
			echo wp_json_encode( [ 'error' => 'OpenCode server is not running' ] );
			exit;
		}

		$path       = $request->get_param( 'path' ) ?: '';
		$target_url = rtrim( $server_url, '/' ) . '/' . ltrim( $path, '/' );

		$query_params = $request->get_query_params();
		unset( $query_params['_wf_token'], $query_params['path'], $query_params['rest_route'] );
		if ( ! empty( $query_params ) ) {
			$target_url .= '?' . http_build_query( $query_params );
		}

		$headers = [
			'Accept' => $request->get_header( 'accept' ) ?: '*/*',
			// Always set the WordPress root as the OpenCode working directory
			'X-Opencode-Directory' => $this->get_wordpress_root(),
		];

		$content_type = $request->get_header( 'content-type' );
		if ( $content_type ) {
			$headers['Content-Type'] = $content_type;
		}

		$args = [
			'method'  => $method,
			'timeout' => 120,
			'headers' => $headers,
		];

		$body = $request->get_body();
		if ( in_array( $method, [ 'POST', 'PUT', 'PATCH' ], true ) && $body ) {
			$args['body'] = $body;
		}

		$is_sse = str_contains( $request->get_header( 'accept' ) ?? '', 'text/event-stream' );

		if ( $is_sse ) {
			$this->proxy_sse_request( $target_url, $args );
		} else {
			$this->proxy_standard_request( $target_url, $args );
		}
	}

	private function send_cors_headers(): void {
		$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

		$allowed_origins = [
			'https://app.opencode.ai',
			'http://localhost:3000',
		];

		if ( in_array( $origin, $allowed_origins, true ) ) {
			header( 'Access-Control-Allow-Origin: ' . $origin );
		} else {
			header( 'Access-Control-Allow-Origin: https://app.opencode.ai' );
		}

		header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Content-Type, Accept, X-Opencode-Directory' );
		header( 'Access-Control-Max-Age: 86400' );
	}

	private function get_wordpress_root(): string {
		return untrailingslashit( ABSPATH );
	}

	private function proxy_standard_request( string $target_url, array $args ): void {
		$response = wp_remote_request( $target_url, $args );

		if ( is_wp_error( $response ) ) {
			status_header( 502 );
			header( 'Content-Type: application/json' );
			echo wp_json_encode( [ 'error' => 'Proxy error: ' . $response->get_error_message() ] );
			exit;
		}

		$status_code  = wp_remote_retrieve_response_code( $response );
		$content_type = wp_remote_retrieve_header( $response, 'content-type' );
		$body         = wp_remote_retrieve_body( $response );

		status_header( $status_code );

		if ( $content_type ) {
			header( 'Content-Type: ' . $content_type );
		}

		echo $body;
		exit;
	}

	private function proxy_sse_request( string $target_url, array $args ): void {
		header( 'Content-Type: text/event-stream' );
		header( 'Cache-Control: no-cache' );
		header( 'Connection: keep-alive' );
		header( 'X-Accel-Buffering: no' );

		if ( ob_get_level() ) {
			ob_end_flush();
		}

		$ch = curl_init( $target_url );
		curl_setopt( $ch, CURLOPT_HTTPHEADER, [
			'Accept: text/event-stream',
			'Cache-Control: no-cache',
			'X-Opencode-Directory: ' . $this->get_wordpress_root(),
		] );
		curl_setopt( $ch, CURLOPT_WRITEFUNCTION, function ( $ch, $data ) {
			echo $data;
			if ( ob_get_level() ) {
				ob_flush();
			}
			flush();
			return strlen( $data );
		} );
		curl_setopt( $ch, CURLOPT_TIMEOUT, 0 );
		curl_setopt( $ch, CURLOPT_CONNECTTIMEOUT, 10 );

		curl_exec( $ch );
		curl_close( $ch );
		exit;
	}

	public static function get_proxy_url_with_token(): string {
		$user = wp_get_current_user();
		$time = time();
		$data = [
			'user_id' => $user->ID,
			'exp'     => $time + 3600,
			'iat'     => $time,
		];

		$payload   = base64_encode( wp_json_encode( $data ) );
		$signature = hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );
		$token     = $payload . '.' . $signature;

		return rest_url( 'wordforge/v1/opencode/proxy' ) . '?_wf_token=' . urlencode( $token );
	}
}
