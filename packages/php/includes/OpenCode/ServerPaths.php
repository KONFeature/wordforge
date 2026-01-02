<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class ServerPaths {

	private const DEFAULT_PORT = 4096;

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

	public static function get_config_dir(): string {
		return self::get_state_dir() . '/config';
	}

	public static function get_config_file(): string {
		return self::get_config_dir() . '/opencode.json';
	}

	public static function get_log_file(): string {
		return self::get_state_dir() . '/server.log';
	}

	public static function get_default_port(): int {
		return self::DEFAULT_PORT;
	}

	public static function find_available_port(): int {
		$port = self::DEFAULT_PORT;

		for ( $i = 0; $i < 100; $i++ ) {
			$socket = @fsockopen( '127.0.0.1', $port, $errno, $errstr, 0.1 );

			if ( false === $socket ) {
				return $port;
			}

			fclose( $socket );
			++$port;
		}

		return self::DEFAULT_PORT + wp_rand( 100, 999 );
	}

	public static function cleanup_state_files(): void {
		$files = array(
			self::get_pid_file(),
			self::get_port_file(),
		);

		foreach ( $files as $file ) {
			if ( file_exists( $file ) ) {
				unlink( $file );
			}
		}
	}
}
