<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class ServerProcess {

	private const DEFAULT_PORT     = 4096;
	private const STARTUP_TIMEOUT  = 10;
	private const HEALTH_CHECK_URL = 'http://127.0.0.1:%d/global/health';

	public static function get_state_dir(): string {
		$upload_dir = wp_upload_dir();
		return $upload_dir['basedir'] . '/wordforge-opencode';
	}

	public static function get_pid_file(): string {
		return self::get_state_dir() . '/server.pid';
	}

	public static function get_port_file(): string {
		return self::get_state_dir() . '/server.port';
	}

	public static function get_config_file(): string {
		return self::get_state_dir() . '/opencode.json';
	}

	public static function get_log_file(): string {
		return self::get_state_dir() . '/server.log';
	}

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

		if ( function_exists( 'posix_kill' ) ) {
			return posix_kill( $pid, 0 );
		}

		exec( "kill -0 {$pid} 2>/dev/null", $output, $result );
		return 0 === $result;
	}

	public static function get_pid(): ?int {
		$pid_file = self::get_pid_file();

		if ( ! file_exists( $pid_file ) ) {
			return null;
		}

		$pid = (int) trim( file_get_contents( $pid_file ) );
		return $pid > 0 ? $pid : null;
	}

	public static function get_port(): ?int {
		$port_file = self::get_port_file();

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
	 * @param array{providers?: array, mcp_auth_token?: string} $options
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

		$port   = self::find_available_port();
		$config = self::generate_config( $options, $port );

		$config_file = self::get_config_file();
		file_put_contents( $config_file, wp_json_encode( $config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );

		$binary   = BinaryManager::get_binary_path();
		$log_file = self::get_log_file();

		if ( self::is_windows() ) {
			$cmd = sprintf(
				'start /B "" "%s" serve --port=%d --hostname=127.0.0.1 > "%s" 2>&1',
				$binary,
				$port,
				$log_file
			);
			pclose( popen( $cmd, 'r' ) );
			$pid = self::find_process_by_port( $port );
		} else {
			$cmd = sprintf(
				'cd %s && %s serve --port=%d --hostname=127.0.0.1 > %s 2>&1 & echo $!',
				escapeshellarg( self::get_state_dir() ),
				escapeshellarg( $binary ),
				$port,
				escapeshellarg( $log_file )
			);
			$pid = (int) trim( shell_exec( $cmd ) );
		}

		if ( $pid <= 0 ) {
			return [
				'success' => false,
				'error'   => 'Failed to start OpenCode server',
			];
		}

		file_put_contents( self::get_pid_file(), (string) $pid );
		file_put_contents( self::get_port_file(), (string) $port );

		$health = self::wait_for_health( $port, self::STARTUP_TIMEOUT );

		if ( ! $health['healthy'] ) {
			self::stop();
			return [
				'success' => false,
				'error'   => $health['error'] ?? 'Server failed health check',
			];
		}

		self::register_wordforge_mcp( $port, $options['mcp_auth_token'] ?? '' );

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
			self::cleanup_state_files();
			return true;
		}

		if ( self::is_windows() ) {
			exec( "taskkill /F /PID {$pid} 2>NUL" );
		} elseif ( function_exists( 'posix_kill' ) ) {
			posix_kill( $pid, SIGTERM );
			usleep( 500000 );

			if ( self::is_running() ) {
				posix_kill( $pid, SIGKILL );
			}
		} else {
			exec( "kill -15 {$pid} 2>/dev/null" );
			usleep( 500000 );

			if ( self::is_running() ) {
				exec( "kill -9 {$pid} 2>/dev/null" );
			}
		}

		self::cleanup_state_files();
		return true;
	}

	private static function cleanup_state_files(): void {
		$files = [
			self::get_pid_file(),
			self::get_port_file(),
		];

		foreach ( $files as $file ) {
			if ( file_exists( $file ) ) {
				unlink( $file );
			}
		}
	}

	/**
	 * @return array{healthy: bool, version?: string, error?: string}
	 */
	private static function wait_for_health( int $port, int $timeout_seconds ): array {
		$url       = sprintf( self::HEALTH_CHECK_URL, $port );
		$start     = time();
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

	private static function find_available_port(): int {
		$port = self::DEFAULT_PORT;

		for ( $i = 0; $i < 100; $i++ ) {
			$socket = @fsockopen( '127.0.0.1', $port, $errno, $errstr, 0.1 );

			if ( false === $socket ) {
				return $port;
			}

			fclose( $socket );
			$port++;
		}

		return self::DEFAULT_PORT + wp_rand( 100, 999 );
	}

	private static function generate_config( array $options, int $port ): array {
		$config = [
			'$schema' => 'https://opencode.ai/config.json',
		];

		if ( ! empty( $options['providers'] ) ) {
			$config['provider'] = $options['providers'];
		}

		return $config;
	}

	private static function register_wordforge_mcp( int $port, string $auth_token ): void {
		if ( empty( $auth_token ) ) {
			return;
		}

		$mcp_url = \WordForge\get_endpoint_url();

		$response = wp_remote_post(
			"http://127.0.0.1:{$port}/mcp",
			[
				'headers' => [ 'Content-Type' => 'application/json' ],
				'body'    => wp_json_encode( [
					'name'   => 'wordforge',
					'config' => [
						'type'    => 'remote',
						'url'     => $mcp_url,
						'headers' => [
							'Authorization' => 'Bearer ' . $auth_token,
						],
					],
				] ),
				'timeout' => 5,
			]
		);

		if ( is_wp_error( $response ) ) {
			error_log( 'WordForge: Failed to register MCP: ' . $response->get_error_message() );
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

	public static function get_status(): array {
		$running = self::is_running();

		return [
			'running'   => $running,
			'pid'       => self::get_pid(),
			'port'      => self::get_port(),
			'url'       => $running ? self::get_server_url() : null,
			'binary'    => BinaryManager::is_installed(),
			'version'   => BinaryManager::get_installed_version(),
		];
	}
}
