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
		return 'win32' === self::get_os() ? 'opencode.exe' : 'opencode';
	}

	private static function get_archive_name(): string {
		$os   = self::get_os();
		$arch = self::get_arch();
		$base = "opencode-{$os}-{$arch}";

		return 'linux' === $os ? "{$base}.tar.gz" : "{$base}.zip";
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

		$version       = ltrim( $body['tag_name'], 'v' );
		$archive_name  = self::get_archive_name();
		$download_url  = self::DOWNLOAD_BASE_URL . "/v{$version}/{$archive_name}";

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
			$progress_callback( 'downloading', 'Downloading archive...' );
		}

		if ( ! \function_exists( 'download_url' ) ) {
			require_once \ABSPATH . 'wp-admin/includes/file.php';
		}

		$temp_archive = \download_url( $release['download_url'], 300 );

		if ( is_wp_error( $temp_archive ) ) {
			return $temp_archive;
		}

		if ( $progress_callback ) {
			$progress_callback( 'extracting', 'Extracting binary...' );
		}

		$extract_result = self::extract_binary( $temp_archive, $dir );
		@unlink( $temp_archive );

		if ( is_wp_error( $extract_result ) ) {
			return $extract_result;
		}

		$binary_path = self::get_binary_path();
		if ( 'win32' !== self::get_os() ) {
			chmod( $binary_path, 0755 );
		}

		file_put_contents( $dir . '/.version', $release['version'] );

		if ( $progress_callback ) {
			$progress_callback( 'complete', 'OpenCode v' . $release['version'] . ' installed' );
		}

		return true;
	}

	/**
	 * @return true|\WP_Error
	 */
	private static function extract_binary( string $archive_path, string $dest_dir ) {
		$os           = self::get_os();
		$binary_name  = self::get_binary_name();
		$binary_path  = $dest_dir . '/' . $binary_name;

		if ( file_exists( $binary_path ) ) {
			unlink( $binary_path );
		}

		if ( 'linux' === $os ) {
			$escaped_archive = escapeshellarg( $archive_path );
			$escaped_dest    = escapeshellarg( $dest_dir );

			$cmd    = "tar -xzf {$escaped_archive} -C {$escaped_dest} opencode 2>&1";
			$output = [];
			$code   = 0;
			exec( $cmd, $output, $code );

			if ( 0 !== $code ) {
				return new \WP_Error( 'extract_failed', 'Failed to extract tar.gz: ' . implode( "\n", $output ) );
			}
		} else {
			$zip = new \ZipArchive();
			if ( true !== $zip->open( $archive_path ) ) {
				return new \WP_Error( 'zip_open_failed', 'Could not open zip archive' );
			}

			$extracted = $zip->extractTo( $dest_dir, [ $binary_name ] );
			$zip->close();

			if ( ! $extracted ) {
				return new \WP_Error( 'extract_failed', 'Failed to extract binary from zip' );
			}
		}

		if ( ! file_exists( $binary_path ) ) {
			return new \WP_Error( 'binary_not_found', 'Binary not found after extraction' );
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
			'archive_name' => self::get_archive_name(),
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
