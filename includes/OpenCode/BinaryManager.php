<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class BinaryManager {

	private const GITHUB_API_LATEST = 'https://api.github.com/repos/sst/opencode/releases/latest';
	private const DOWNLOAD_BASE_URL = 'https://github.com/sst/opencode/releases/download';

	public static function get_binary_dir(): string {
		$upload_dir = wp_upload_dir();
		return $upload_dir['basedir'] . '/wordforge-opencode';
	}

	public static function get_binary_path(): string {
		return self::get_binary_dir() . '/' . self::get_binary_name();
	}

	public static function get_binary_name(): string {
		$os   = self::get_os();
		$arch = self::get_arch();
		$name = "opencode-{$os}-{$arch}";

		if ( 'win32' === $os ) {
			$name .= '.exe';
		}

		return $name;
	}

	private static function get_os(): string {
		$uname = strtolower( php_uname( 's' ) );

		if ( str_contains( $uname, 'darwin' ) ) {
			return 'darwin';
		}
		if ( str_contains( $uname, 'win' ) ) {
			return 'win32';
		}
		return 'linux';
	}

	private static function get_arch(): string {
		$machine = strtolower( php_uname( 'm' ) );

		if ( in_array( $machine, [ 'arm64', 'aarch64' ], true ) ) {
			return 'arm64';
		}
		return 'x64';
	}

	public static function is_installed(): bool {
		$path = self::get_binary_path();
		return file_exists( $path ) && is_executable( $path );
	}

	public static function get_installed_version(): ?string {
		$version_file = self::get_binary_dir() . '/.version';

		if ( ! file_exists( $version_file ) ) {
			return null;
		}

		return trim( file_get_contents( $version_file ) );
	}

	/**
	 * @return array{version: string, download_url: string, tag_name: string}|\WP_Error
	 */
	public static function fetch_latest_release() {
		$response = wp_remote_get(
			self::GITHUB_API_LATEST,
			[
				'headers' => [
					'Accept'     => 'application/vnd.github.v3+json',
					'User-Agent' => 'WordForge/' . WORDFORGE_VERSION,
				],
				'timeout' => 30,
			]
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $code ) {
			return new \WP_Error(
				'github_api_error',
				sprintf( 'GitHub API returned status %d', $code )
			);
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( empty( $body['tag_name'] ) ) {
			return new \WP_Error( 'invalid_response', 'Invalid GitHub API response' );
		}

		$version      = ltrim( $body['tag_name'], 'v' );
		$binary_name  = self::get_binary_name();
		$download_url = self::DOWNLOAD_BASE_URL . "/v{$version}/{$binary_name}";

		return [
			'version'      => $version,
			'download_url' => $download_url,
			'tag_name'     => $body['tag_name'],
		];
	}

	/**
	 * @return array{available: bool, current: ?string, latest: string}|\WP_Error
	 */
	public static function check_for_update() {
		$latest = self::fetch_latest_release();

		if ( is_wp_error( $latest ) ) {
			return $latest;
		}

		$current = self::get_installed_version();

		return [
			'available' => null === $current || version_compare( $current, $latest['version'], '<' ),
			'current'   => $current,
			'latest'    => $latest['version'],
		];
	}

	/**
	 * @param callable|null $progress_callback Receives (string $stage, string $message).
	 * @return true|\WP_Error
	 */
	public static function download_latest( ?callable $progress_callback = null ) {
		$release = self::fetch_latest_release();

		if ( is_wp_error( $release ) ) {
			return $release;
		}

		if ( $progress_callback ) {
			$progress_callback( 'fetching', 'Fetching OpenCode v' . $release['version'] . '...' );
		}

		$dir = self::get_binary_dir();
		if ( ! file_exists( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return new \WP_Error( 'mkdir_failed', 'Could not create binary directory' );
		}

		$htaccess = $dir . '/.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			file_put_contents( $htaccess, "Deny from all\n" );
		}

		if ( $progress_callback ) {
			$progress_callback( 'downloading', 'Downloading binary...' );
		}

		$temp_file = download_url( $release['download_url'], 300 );

		if ( is_wp_error( $temp_file ) ) {
			return $temp_file;
		}

		$binary_path = self::get_binary_path();

		if ( file_exists( $binary_path ) ) {
			unlink( $binary_path );
		}

		if ( ! rename( $temp_file, $binary_path ) ) {
			unlink( $temp_file );
			return new \WP_Error( 'move_failed', 'Could not move binary to final location' );
		}

		if ( 'win32' !== self::get_os() ) {
			chmod( $binary_path, 0755 );
		}

		file_put_contents( $dir . '/.version', $release['version'] );

		if ( $progress_callback ) {
			$progress_callback( 'complete', 'OpenCode v' . $release['version'] . ' installed' );
		}

		return true;
	}

	public static function cleanup(): bool {
		$dir = self::get_binary_dir();

		if ( ! file_exists( $dir ) ) {
			return true;
		}

		$files = glob( $dir . '/*' );
		foreach ( $files as $file ) {
			if ( is_file( $file ) ) {
				unlink( $file );
			}
		}

		$hidden = glob( $dir . '/.*' );
		foreach ( $hidden as $file ) {
			if ( is_file( $file ) ) {
				unlink( $file );
			}
		}

		return rmdir( $dir );
	}

	public static function get_platform_info(): array {
		return [
			'os'           => self::get_os(),
			'arch'         => self::get_arch(),
			'binary_name'  => self::get_binary_name(),
			'binary_dir'   => self::get_binary_dir(),
			'binary_path'  => self::get_binary_path(),
			'is_installed' => self::is_installed(),
			'version'      => self::get_installed_version(),
			'php_uname_s'  => php_uname( 's' ),
			'php_uname_m'  => php_uname( 'm' ),
		];
	}
}
