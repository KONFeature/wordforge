<?php

declare(strict_types=1);

namespace WordForge\Admin;

use WordForge\OpenCode\ActivityMonitor;
use WordForge\OpenCode\AgentConfig;
use WordForge\OpenCode\BinaryManager;
use WordForge\OpenCode\LocalServerConfig;
use WordForge\OpenCode\ProviderConfig;
use WordForge\OpenCode\ServerProcess;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class OpenCodeController {

	private const NAMESPACE = 'wordforge/v1';

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/opencode/status',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_status' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/download',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'download_binary' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/start',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'start_server' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/stop',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'stop_server' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/cleanup',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'cleanup' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/refresh',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'refresh_context' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/session-token',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_session_token' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/proxy/(?P<path>.*)',
			array(
				'methods'             => array( 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS' ),
				'callback'            => array( $this, 'proxy_to_opencode' ),
				'permission_callback' => array( $this, 'check_proxy_permission' ),
				'args'                => array(
					'path' => array(
						'required' => false,
						'default'  => '',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/providers',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_providers' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'save_provider' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/providers/(?P<provider_id>[a-z]+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_provider' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'provider_id' => array(
						'required' => true,
						'type'     => 'string',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/agents',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_agents' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'save_agents' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/agents/reset',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'reset_agents' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/activity',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_activity' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/auto-start',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'auto_start_server' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/auto-shutdown',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_auto_shutdown_settings' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'save_auto_shutdown_settings' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/local-config',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'download_local_config' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/opencode/local-settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_local_settings' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'save_local_settings' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
			)
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

		return new WP_REST_Response(
			array(
				'binary'   => $binary_status,
				'server'   => $server_status,
				'update'   => is_wp_error( $update_info ) ? null : $update_info,
				'activity' => ActivityMonitor::get_status(),
			)
		);
	}

	public function download_binary(): WP_REST_Response {
		set_time_limit( 300 );

		$result = BinaryManager::download_latest();

		if ( is_wp_error( $result ) ) {
			return new WP_REST_Response(
				array( 'error' => $result->get_error_message() ),
				500
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'version' => BinaryManager::get_installed_version(),
				'binary'  => BinaryManager::get_platform_info(),
			)
		);
	}

	public function start_server(): WP_REST_Response {
		if ( ! BinaryManager::is_installed() ) {
			return new WP_REST_Response(
				array( 'error' => 'OpenCode binary not installed. Please download first.' ),
				400
			);
		}

		$token  = $this->generate_mcp_auth_token();
		$result = ServerProcess::start(
			array(
				'mcp_auth_token' => $token,
			)
		);

		if ( ! $result['success'] ) {
			return new WP_REST_Response(
				array( 'error' => $result['error'] ?? 'Failed to start server' ),
				500
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'url'     => $result['url'],
				'port'    => $result['port'],
				'version' => $result['version'] ?? null,
				'status'  => $result['status'],
			)
		);
	}

	public function stop_server(): WP_REST_Response {
		ServerProcess::stop();

		return new WP_REST_Response(
			array(
				'success' => true,
				'server'  => ServerProcess::get_status(),
			)
		);
	}

	public function cleanup(): WP_REST_Response {
		ServerProcess::stop();
		BinaryManager::cleanup();

		return new WP_REST_Response(
			array(
				'success' => true,
				'binary'  => BinaryManager::get_platform_info(),
				'server'  => ServerProcess::get_status(),
			)
		);
	}

	public function refresh_context(): WP_REST_Response {
		ServerProcess::stop();
		usleep( 500000 );

		$token  = $this->generate_mcp_auth_token();
		$result = ServerProcess::start(
			array(
				'mcp_auth_token' => $token,
			)
		);

		if ( ! $result['success'] ) {
			return new WP_REST_Response(
				array( 'error' => $result['error'] ?? 'Failed to restart server' ),
				500
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => 'WordPress context refreshed',
				'url'     => $result['url'],
				'port'    => $result['port'],
				'version' => $result['version'] ?? null,
			)
		);
	}

	public function create_session_token(): WP_REST_Response {
		$token = $this->generate_mcp_auth_token();

		return new WP_REST_Response(
			array(
				'token'     => $token,
				'expiresIn' => 3600,
			)
		);
	}

	private function generate_mcp_auth_token(): string {
		$user = wp_get_current_user();
		$time = time();
		$data = array(
			'user_id' => $user->ID,
			'exp'     => $time + 3600,
			'iat'     => $time,
		);

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

		ActivityMonitor::record_activity();

		$server_url = ServerProcess::get_server_url();

		if ( ! $server_url ) {
			status_header( 503 );
			header( 'Content-Type: application/json' );
			echo wp_json_encode( array( 'error' => 'OpenCode server is not running' ) );
			exit;
		}

		$path       = $request->get_param( 'path' ) ?: '';
		$target_url = rtrim( $server_url, '/' ) . '/' . ltrim( $path, '/' );

		$query_params = $request->get_query_params();
		unset( $query_params['_wf_token'], $query_params['path'], $query_params['rest_route'] );
		if ( ! empty( $query_params ) ) {
			$target_url .= '?' . http_build_query( $query_params );
		}

		$headers = array(
			'Accept'               => $request->get_header( 'accept' ) ?: '*/*',
			// Always set the WordPress root as the OpenCode working directory
			'X-Opencode-Directory' => $this->get_wordpress_root(),
		);

		$content_type = $request->get_header( 'content-type' );
		if ( $content_type ) {
			$headers['Content-Type'] = $content_type;
		}

		$args = array(
			'method'  => $method,
			'timeout' => 120,
			'headers' => $headers,
		);

		$body = $request->get_body();
		if ( in_array( $method, array( 'POST', 'PUT', 'PATCH' ), true ) && $body ) {
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

		$allowed_origins = array(
			'https://app.opencode.ai',
			'http://localhost:3000',
		);

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
			echo wp_json_encode( array( 'error' => 'Proxy error: ' . $response->get_error_message() ) );
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
		curl_setopt(
			$ch,
			CURLOPT_HTTPHEADER,
			array(
				'Accept: text/event-stream',
				'Cache-Control: no-cache',
				'X-Opencode-Directory: ' . $this->get_wordpress_root(),
			)
		);
		curl_setopt(
			$ch,
			CURLOPT_WRITEFUNCTION,
			function ( $ch, $data ) {
				echo $data;
				if ( ob_get_level() ) {
					ob_flush();
				}
				flush();
				return strlen( $data );
			}
		);
		curl_setopt( $ch, CURLOPT_TIMEOUT, 0 );
		curl_setopt( $ch, CURLOPT_CONNECTTIMEOUT, 10 );

		curl_exec( $ch );
		curl_close( $ch );
		exit;
	}

	public static function get_proxy_url_with_token(): string {
		$user = wp_get_current_user();
		$time = time();
		$data = array(
			'user_id' => $user->ID,
			'exp'     => $time + 3600,
			'iat'     => $time,
		);

		$payload   = base64_encode( wp_json_encode( $data ) );
		$signature = hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );
		$token     = $payload . '.' . $signature;

		return rest_url( 'wordforge/v1/opencode/proxy' ) . '?_wf_token=' . urlencode( $token );
	}

	public function get_providers(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'configuredProviders' => ProviderConfig::get_configured_providers(),
			)
		);
	}

	public function save_provider( WP_REST_Request $request ): WP_REST_Response {
		$provider_id = $request->get_param( 'providerId' );
		$api_key     = $request->get_param( 'apiKey' );

		if ( empty( $provider_id ) ) {
			return new WP_REST_Response(
				array( 'error' => 'Provider ID is required' ),
				400
			);
		}

		if ( empty( $api_key ) ) {
			return new WP_REST_Response(
				array( 'error' => 'API key is required' ),
				400
			);
		}

		$result = ProviderConfig::save_provider_key( $provider_id, $api_key );

		if ( ! $result ) {
			return new WP_REST_Response(
				array( 'error' => 'Failed to save API key' ),
				500
			);
		}

		$this->restart_server_if_running();

		return new WP_REST_Response(
			array(
				'success'             => true,
				'configuredProviders' => ProviderConfig::get_configured_providers(),
			)
		);
	}

	public function delete_provider( WP_REST_Request $request ): WP_REST_Response {
		$provider_id = $request->get_param( 'provider_id' );

		if ( empty( $provider_id ) ) {
			return new WP_REST_Response(
				array( 'error' => 'Provider ID is required' ),
				400
			);
		}

		ProviderConfig::remove_provider_key( $provider_id );

		$this->restart_server_if_running();

		return new WP_REST_Response(
			array(
				'success'             => true,
				'configuredProviders' => ProviderConfig::get_configured_providers(),
			)
		);
	}

	public function get_agents(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'agents' => AgentConfig::get_agents_for_display(),
			)
		);
	}

	public function save_agents( WP_REST_Request $request ): WP_REST_Response {
		$models = $request->get_param( 'models' );

		if ( ! is_array( $models ) ) {
			return new WP_REST_Response(
				array( 'error' => 'Invalid models format' ),
				400
			);
		}

		$result = AgentConfig::save_agent_models( $models );

		if ( ! $result ) {
			return new WP_REST_Response(
				array( 'error' => 'Failed to save agent models' ),
				500
			);
		}

		$this->restart_server_if_running();

		return new WP_REST_Response(
			array(
				'success' => true,
				'agents'  => AgentConfig::get_agents_for_display(),
			)
		);
	}

	public function reset_agents(): WP_REST_Response {
		AgentConfig::reset_to_recommended();

		$this->restart_server_if_running();

		return new WP_REST_Response(
			array(
				'success' => true,
				'agents'  => AgentConfig::get_agents_for_display(),
			)
		);
	}

	public function get_activity(): WP_REST_Response {
		return new WP_REST_Response( ActivityMonitor::get_status() );
	}

	public function auto_start_server(): WP_REST_Response {
		if ( ! BinaryManager::is_installed() ) {
			set_time_limit( 300 );

			$download_result = BinaryManager::download_latest();

			if ( is_wp_error( $download_result ) ) {
				return new WP_REST_Response(
					array( 'error' => 'Download failed: ' . $download_result->get_error_message() ),
					500
				);
			}
		}

		$token  = $this->generate_mcp_auth_token();
		$result = ServerProcess::start(
			array(
				'mcp_auth_token' => $token,
			)
		);

		if ( ! $result['success'] ) {
			return new WP_REST_Response(
				array( 'error' => $result['error'] ?? 'Failed to start server' ),
				500
			);
		}

		return new WP_REST_Response(
			array(
				'success'  => true,
				'url'      => $result['url'],
				'port'     => $result['port'],
				'version'  => $result['version'] ?? null,
				'status'   => $result['status'],
				'binary'   => BinaryManager::get_platform_info(),
				'activity' => ActivityMonitor::get_status(),
			)
		);
	}

	public function get_auto_shutdown_settings(): WP_REST_Response {
		$settings = \WordForge\get_settings();

		return new WP_REST_Response(
			array(
				'enabled'   => $settings['auto_shutdown_enabled'] ?? true,
				'threshold' => $settings['auto_shutdown_threshold'] ?? 1800,
				'activity'  => ActivityMonitor::get_status(),
			)
		);
	}

	public function save_auto_shutdown_settings( WP_REST_Request $request ): WP_REST_Response {
		$enabled   = $request->get_param( 'enabled' );
		$threshold = $request->get_param( 'threshold' );

		$settings = \WordForge\get_settings();

		if ( null !== $enabled ) {
			$settings['auto_shutdown_enabled'] = (bool) $enabled;
		}

		if ( null !== $threshold ) {
			$threshold                           = absint( $threshold );
			$settings['auto_shutdown_threshold'] = max( 300, min( 86400, $threshold ) );
		}

		update_option( 'wordforge_settings', $settings );

		if ( $settings['auto_shutdown_enabled'] ) {
			ActivityMonitor::schedule_cron();
		} else {
			ActivityMonitor::unschedule_cron();
		}

		return new WP_REST_Response(
			array(
				'success'   => true,
				'enabled'   => $settings['auto_shutdown_enabled'],
				'threshold' => $settings['auto_shutdown_threshold'],
				'activity'  => ActivityMonitor::get_status(),
			)
		);
	}

	private function restart_server_if_running(): void {
		if ( ! ServerProcess::is_running() ) {
			return;
		}

		ServerProcess::stop();
		usleep( 300000 );

		$token = $this->generate_mcp_auth_token();
		ServerProcess::start(
			array(
				'mcp_auth_token' => $token,
			)
		);
	}

	public function download_local_config(): void {
		$config    = LocalServerConfig::generate();
		$agents_md = LocalServerConfig::generate_agents_md();
		$site_name = \sanitize_title( \get_bloginfo( 'name' ) );

		if ( empty( $site_name ) ) {
			$site_name = 'wordpress-site';
		}

		$zip_filename = 'wordforge-' . $site_name . '-config.zip';
		$temp_file    = tempnam( sys_get_temp_dir(), 'wordforge_' );

		$zip = new \ZipArchive();
		if ( true !== $zip->open( $temp_file, \ZipArchive::CREATE | \ZipArchive::OVERWRITE ) ) {
			\status_header( 500 );
			header( 'Content-Type: application/json' );
			echo \wp_json_encode( array( 'error' => 'Failed to create ZIP archive' ) );
			exit;
		}

		$zip->addFromString( 'opencode.json', \wp_json_encode( $config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
		$zip->addFromString( 'AGENTS.md', $agents_md );
		$zip->close();

		header( 'Content-Type: application/zip' );
		header( 'Content-Disposition: attachment; filename="' . $zip_filename . '"' );
		header( 'Content-Length: ' . filesize( $temp_file ) );
		header( 'Cache-Control: no-cache, no-store, must-revalidate' );
		header( 'Pragma: no-cache' );
		header( 'Expires: 0' );

		readfile( $temp_file );
		unlink( $temp_file );
		exit;
	}

	public function get_local_settings(): WP_REST_Response {
		$settings = LocalServerConfig::get_settings();

		return new WP_REST_Response(
			array(
				'port'    => $settings['port'],
				'enabled' => $settings['enabled'],
			)
		);
	}

	public function save_local_settings( WP_REST_Request $request ): WP_REST_Response {
		$port    = $request->get_param( 'port' );
		$enabled = $request->get_param( 'enabled' );

		$settings = array();

		if ( null !== $port ) {
			$settings['port'] = absint( $port );
		}

		if ( null !== $enabled ) {
			$settings['enabled'] = (bool) $enabled;
		}

		$result = LocalServerConfig::save_settings( $settings );

		if ( ! $result ) {
			return new WP_REST_Response(
				array( 'error' => 'Failed to save settings' ),
				500
			);
		}

		$updated = LocalServerConfig::get_settings();

		return new WP_REST_Response(
			array(
				'success' => true,
				'port'    => $updated['port'],
				'enabled' => $updated['enabled'],
			)
		);
	}
}
