<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class ServerProcess {

	private const STARTUP_TIMEOUT  = 10;
	private const HEALTH_CHECK_URL = 'http://127.0.0.1:%d/global/health';

	public static function is_running(): bool {
		$pid = self::get_pid();

		if ( null === $pid ) {
			return false;
		}

		if ( self::is_windows() ) {
			exec( "tasklist /FI \"PID eq {$pid}\" 2>NUL", $output );
			return count( $output ) > 1;
		}

		if ( file_exists( "/proc/{$pid}" ) ) {
			return true;
		}

		if ( \function_exists( 'posix_kill' ) ) {
			return \posix_kill( $pid, 0 );
		}

		exec( "kill -0 {$pid} 2>/dev/null", $output, $result );
		return 0 === $result;
	}

	public static function get_pid(): ?int {
		$pid_file = ServerPaths::get_pid_file();

		if ( ! file_exists( $pid_file ) ) {
			return null;
		}

		$pid = (int) trim( file_get_contents( $pid_file ) );
		return $pid > 0 ? $pid : null;
	}

	public static function get_port(): ?int {
		$port_file = ServerPaths::get_port_file();

		if ( ! file_exists( $port_file ) ) {
			return null;
		}

		$port = (int) trim( file_get_contents( $port_file ) );
		return $port > 0 ? $port : null;
	}

	public static function get_server_url(): ?string {
		$port = self::get_port();

		if ( null === $port || ! self::is_running() ) {
			return null;
		}

		return "http://127.0.0.1:{$port}";
	}

	/**
	 * @param array{mcp_auth_token?: string} $options
	 * @return array{success: bool, url?: string, port?: int, error?: string}
	 */
	public static function start( array $options = [] ): array {
		if ( self::is_running() ) {
			return [
				'success' => true,
				'url'     => self::get_server_url(),
				'port'    => self::get_port(),
				'status'  => 'already_running',
			];
		}

		if ( ! BinaryManager::is_installed() ) {
			return [
				'success' => false,
				'error'   => 'OpenCode binary not installed',
			];
		}

		$port   = ServerPaths::find_available_port();
		$config = ServerConfig::generate( $options, $port );

		$config_dir = ServerPaths::get_config_dir();
		if ( ! file_exists( $config_dir ) ) {
			wp_mkdir_p( $config_dir );
		}

		$config_file = ServerPaths::get_config_file();
		file_put_contents( $config_file, wp_json_encode( $config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );

		$binary    = BinaryManager::get_binary_path();
		$log_file  = ServerPaths::get_log_file();
		$state_dir = ServerPaths::get_state_dir();

		$pid = self::spawn_server( $binary, $port, $state_dir, $config_dir, $log_file );

		if ( $pid <= 0 ) {
			return [
				'success' => false,
				'error'   => 'Failed to start OpenCode server',
			];
		}

		file_put_contents( ServerPaths::get_pid_file(), (string) $pid );
		file_put_contents( ServerPaths::get_port_file(), (string) $port );

		$health = self::wait_for_health( $port, self::STARTUP_TIMEOUT );

		if ( ! $health['healthy'] ) {
			self::stop();
			return [
				'success' => false,
				'error'   => $health['error'] ?? 'Server failed health check',
			];
		}

		self::register_mcp( $port );
		ActivityMonitor::record_activity();

		return [
			'success' => true,
			'url'     => "http://127.0.0.1:{$port}",
			'port'    => $port,
			'version' => $health['version'] ?? null,
			'status'  => 'started',
		];
	}

	public static function stop(): bool {
		$pid = self::get_pid();

		if ( null === $pid ) {
			ServerPaths::cleanup_state_files();
			return true;
		}

		if ( self::is_windows() ) {
			exec( "taskkill /F /PID {$pid} 2>NUL" );
		} elseif ( \function_exists( 'posix_kill' ) ) {
			\posix_kill( $pid, 15 );
			usleep( 500000 );

			if ( self::is_running() ) {
				\posix_kill( $pid, 9 );
			}
		} else {
			exec( "kill -15 {$pid} 2>/dev/null" );
			usleep( 500000 );

			if ( self::is_running() ) {
				exec( "kill -9 {$pid} 2>/dev/null" );
			}
		}

		ServerPaths::cleanup_state_files();
		ActivityMonitor::clear_activity();
		return true;
	}

	public static function get_status(): array {
		$running = self::is_running();

		return [
			'running' => $running,
			'pid'     => self::get_pid(),
			'port'    => self::get_port(),
			'url'     => $running ? self::get_server_url() : null,
			'binary'  => BinaryManager::is_installed(),
			'version' => BinaryManager::get_installed_version(),
		];
	}

	public static function revoke_app_password(): bool {
		return AppPasswordManager::revoke();
	}

	private static function spawn_server( string $binary, int $port, string $state_dir, string $config_dir, string $log_file ): int {
		if ( self::is_windows() ) {
			$cmd = sprintf(
				'set HOME=%s && set OPENCODE_CONFIG_DIR=%s && start /B "" "%s" serve --port=%d --hostname=127.0.0.1 > "%s" 2>&1',
				$state_dir,
				$config_dir,
				$binary,
				$port,
				$log_file
			);
			pclose( popen( $cmd, 'r' ) );
			return self::find_process_by_port( $port );
		}

		$cmd = sprintf(
			'cd %s && HOME=%s OPENCODE_CONFIG_DIR=%s %s serve --port=%d --hostname=127.0.0.1 > %s 2>&1 & echo $!',
			escapeshellarg( $state_dir ),
			escapeshellarg( $state_dir ),
			escapeshellarg( $config_dir ),
			escapeshellarg( $binary ),
			$port,
			escapeshellarg( $log_file )
		);
		return (int) trim( shell_exec( $cmd ) );
	}

	/**
	 * @return array{healthy: bool, version?: string, error?: string}
	 */
	private static function wait_for_health( int $port, int $timeout_seconds ): array {
		$url        = sprintf( self::HEALTH_CHECK_URL, $port );
		$start      = time();
		$last_error = '';

		while ( ( time() - $start ) < $timeout_seconds ) {
			$response = wp_remote_get( $url, [ 'timeout' => 2 ] );

			if ( ! is_wp_error( $response ) ) {
				$code = wp_remote_retrieve_response_code( $response );

				if ( 200 === $code ) {
					$body = json_decode( wp_remote_retrieve_body( $response ), true );

					if ( ! empty( $body['healthy'] ) ) {
						return [
							'healthy' => true,
							'version' => $body['version'] ?? null,
						];
					}
				}
			} else {
				$last_error = $response->get_error_message();
			}

			usleep( 250000 );
		}

		return [
			'healthy' => false,
			'error'   => $last_error ?: 'Health check timed out',
		];
	}

	private static function register_mcp( int $port ): void {
		$mcp_config = ServerConfig::get_mcp_config();
		if ( ! $mcp_config ) {
			error_log( 'WordForge: Cannot register MCP - no app password available' );
			return;
		}

		$response = wp_remote_post(
			"http://127.0.0.1:{$port}/mcp/add",
			[
				'headers' => [ 'Content-Type' => 'application/json' ],
				'body'    => wp_json_encode( [
					'name'   => 'wordforge',
					'config' => $mcp_config,
				] ),
				'timeout' => 5,
			]
		);

		if ( is_wp_error( $response ) ) {
			error_log( 'WordForge: Failed to register MCP: ' . $response->get_error_message() );
		} else {
			$code = wp_remote_retrieve_response_code( $response );
			if ( $code >= 400 ) {
				error_log( 'WordForge: MCP registration failed with status ' . $code . ': ' . wp_remote_retrieve_body( $response ) );
			}
		}
	}

	private static function find_process_by_port( int $port ): int {
		if ( self::is_windows() ) {
			exec( "netstat -ano | findstr :{$port}", $output );

			if ( ! empty( $output[0] ) ) {
				preg_match( '/\s+(\d+)\s*$/', $output[0], $matches );
				return (int) ( $matches[1] ?? 0 );
			}
		}

		return 0;
	}

	private static function is_windows(): bool {
		return 'WIN' === strtoupper( substr( PHP_OS, 0, 3 ) );
	}
}
