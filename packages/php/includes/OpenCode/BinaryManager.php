<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class BinaryManager {

	private const TARGET_VERSION         = '1.1.13';

	private const GITHUB_REPO            = 'sst/opencode';
	private const GITHUB_API_LATEST      = 'https://api.github.com/repos/sst/opencode/releases/latest';
	private const GITHUB_DOWNLOAD_BASE   = 'https://github.com/sst/opencode/releases/download';
	private const CACHE_KEY              = 'wordforge_opencode_latest_release';
	private const CACHE_EXPIRATION       = HOUR_IN_SECONDS;

	public static function get_binary_dir(): string {
		$upload_dir = wp_upload_dir();
		return $upload_dir['basedir'] . '/wordforge-opencode';
	}

	public static function get_binary_path(): string {
		return self::get_binary_dir() . '/' . self::get_binary_name();
	}

	public static function get_binary_name(): string {
		return 'windows' === self::get_os() ? 'opencode.exe' : 'opencode';
	}

	private static function get_archive_name(): string {
		$target = self::get_target();
		$os     = self::get_os();

		return 'linux' === $os ? "{$target}.tar.gz" : "{$target}.zip";
	}

	/**
	 * Build the full target string including all platform variants.
	 * Examples: opencode-linux-x64, opencode-linux-x64-baseline-musl, opencode-darwin-arm64
	 */
	private static function get_target(): string {
		$os   = self::get_os();
		$arch = self::get_arch();

		$target = "opencode-{$os}-{$arch}";

		if ( self::needs_baseline() ) {
			$target .= '-baseline';
		}

		if ( self::is_musl() ) {
			$target .= '-musl';
		}

		return $target;
	}

	private static function get_os(): string {
		$uname = strtolower( php_uname( 's' ) );

		if ( str_contains( $uname, 'darwin' ) ) {
			return 'darwin';
		}
		if ( str_contains( $uname, 'win' ) || str_contains( $uname, 'mingw' ) || str_contains( $uname, 'msys' ) || str_contains( $uname, 'cygwin' ) ) {
			return 'windows';
		}
		return 'linux';
	}

	private static function get_arch(): string {
		$os      = self::get_os();
		$machine = strtolower( php_uname( 'm' ) );

		// Normalize architecture names.
		if ( in_array( $machine, array( 'arm64', 'aarch64' ), true ) ) {
			$arch = 'arm64';
		} elseif ( in_array( $machine, array( 'x86_64', 'amd64' ), true ) ) {
			$arch = 'x64';
		} else {
			$arch = 'x64'; // Default fallback.
		}

		// Rosetta detection: PHP might report x64 but we're actually on arm64 Mac.
		if ( 'darwin' === $os && 'x64' === $arch ) {
			$arch = self::detect_rosetta_arch( $arch );
		}

		return $arch;
	}

	/**
	 * Detect if running under Rosetta translation on Apple Silicon.
	 * If so, return arm64 to download the native binary.
	 */
	private static function detect_rosetta_arch( string $current_arch ): string {
		// Check sysctl for Rosetta translation flag.
		$output = array();
		$code   = 0;
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec
		@exec( 'sysctl -n sysctl.proc_translated 2>/dev/null', $output, $code );

		if ( 0 === $code && ! empty( $output[0] ) && '1' === trim( $output[0] ) ) {
			return 'arm64';
		}

		return $current_arch;
	}

	/**
	 * Detect if running on musl libc (Alpine Linux, etc.).
	 */
	private static function is_musl(): bool {
		if ( 'linux' !== self::get_os() ) {
			return false;
		}

		// Check for Alpine Linux.
		if ( file_exists( '/etc/alpine-release' ) ) {
			return true;
		}

		// Check ldd version output for musl signature.
		$output = array();
		$code   = 0;
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec
		@exec( 'ldd --version 2>&1', $output, $code );

		$ldd_output = implode( ' ', $output );
		if ( stripos( $ldd_output, 'musl' ) !== false ) {
			return true;
		}

		return false;
	}

	/**
	 * Detect if CPU lacks AVX2 support (needs baseline binary).
	 * Only relevant for x64 architecture.
	 */
	private static function needs_baseline(): bool {
		$arch = self::get_arch();
		$os   = self::get_os();

		if ( 'x64' !== $arch ) {
			return false;
		}

		if ( 'linux' === $os ) {
			return self::linux_needs_baseline();
		}

		if ( 'darwin' === $os ) {
			return self::darwin_needs_baseline();
		}

		return false;
	}

	/**
	 * Check Linux CPU for AVX2 support via /proc/cpuinfo.
	 */
	private static function linux_needs_baseline(): bool {
		if ( ! file_exists( '/proc/cpuinfo' ) ) {
			return false; // Can't detect, assume modern CPU.
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$cpuinfo = @file_get_contents( '/proc/cpuinfo' );
		if ( false === $cpuinfo ) {
			return false;
		}

		// If AVX2 is not found in flags, we need baseline.
		return stripos( $cpuinfo, 'avx2' ) === false;
	}

	/**
	 * Check macOS CPU for AVX2 support via sysctl.
	 */
	private static function darwin_needs_baseline(): bool {
		$output = array();
		$code   = 0;
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec
		@exec( 'sysctl -n hw.optional.avx2_0 2>/dev/null', $output, $code );

		if ( 0 === $code && ! empty( $output[0] ) ) {
			return '1' !== trim( $output[0] );
		}

		return false; // Can't detect, assume modern CPU.
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

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		return trim( file_get_contents( $version_file ) );
	}

	/**
	 * Fetch latest release info from GitHub API with caching.
	 *
	 * @param bool $force_refresh Skip cache and fetch fresh data.
	 * @return array{version: string, download_url: string, tag_name: string}|\WP_Error
	 */
	public static function fetch_latest_release( bool $force_refresh = false ) {
		// Check cache first.
		if ( ! $force_refresh ) {
			$cached = get_transient( self::CACHE_KEY );
			if ( false !== $cached && is_array( $cached ) ) {
				return $cached;
			}
		}

		$response = wp_remote_get(
			self::GITHUB_API_LATEST,
			array(
				'headers' => array(
					'Accept'     => 'application/vnd.github.v3+json',
					'User-Agent' => 'WordForge/' . WORDFORGE_VERSION,
				),
				'timeout' => 30,
			)
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
		$archive_name = self::get_archive_name();
		$download_url = self::GITHUB_DOWNLOAD_BASE . "/v{$version}/{$archive_name}";

		$result = array(
			'version'      => $version,
			'download_url' => $download_url,
			'tag_name'     => $body['tag_name'],
		);

		// Cache the result.
		set_transient( self::CACHE_KEY, $result, self::CACHE_EXPIRATION );

		return $result;
	}

	/**
	 * Get the target version that will be installed.
	 */
	public static function get_target_version(): string {
		return self::TARGET_VERSION;
	}

	/**
	 * @return array{available: bool, current: ?string, target: string}
	 */
	public static function check_for_update(): array {
		$current = self::get_installed_version();
		$target  = self::TARGET_VERSION;

		return array(
			'available' => null === $current || version_compare( $current, $target, '<' ),
			'current'   => $current,
			'target'    => $target,
		);
	}

	/**
	 * Download and install the target OpenCode binary version.
	 *
	 * @param callable|null $progress_callback Receives (string $stage, string $message).
	 * @return true|\WP_Error
	 */
	public static function download_latest( ?callable $progress_callback = null ) {
		$archive_name = self::get_archive_name();
		$version      = self::TARGET_VERSION;
		$download_url = self::GITHUB_DOWNLOAD_BASE . "/v{$version}/{$archive_name}";

		if ( $progress_callback ) {
			$progress_callback( 'fetching', 'Fetching OpenCode v' . $version . '...' );
		}

		$dir = self::get_binary_dir();
		if ( ! file_exists( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return new \WP_Error( 'mkdir_failed', 'Could not create binary directory' );
		}

		$htaccess = $dir . '/.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $htaccess, "Deny from all\n" );
		}

		if ( $progress_callback ) {
			$progress_callback( 'downloading', 'Downloading archive...' );
		}

		if ( ! \function_exists( 'download_url' ) ) {
			require_once \ABSPATH . 'wp-admin/includes/file.php';
		}

		$temp_archive = \download_url( $download_url, 300 );

		if ( is_wp_error( $temp_archive ) ) {
			return $temp_archive;
		}

		if ( $progress_callback ) {
			$progress_callback( 'extracting', 'Extracting binary...' );
		}

		$extract_result = self::extract_binary( $temp_archive, $dir );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink
		@unlink( $temp_archive );

		if ( is_wp_error( $extract_result ) ) {
			return $extract_result;
		}

		$binary_path = self::get_binary_path();
		if ( 'windows' !== self::get_os() ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_chmod
			chmod( $binary_path, 0755 );
		}

		// Get version from the downloaded binary or use target version.
		$detected_version = self::detect_installed_version( $binary_path );
		$version          = $detected_version ?? self::TARGET_VERSION;

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		file_put_contents( $dir . '/.version', $version );

		if ( $progress_callback ) {
			$progress_callback( 'complete', 'OpenCode v' . $version . ' installed' );
		}

		return true;
	}

	/**
	 * Try to detect version from the installed binary.
	 */
	private static function detect_installed_version( string $binary_path ): ?string {
		if ( ! file_exists( $binary_path ) || ! is_executable( $binary_path ) ) {
			return null;
		}

		$output = array();
		$code   = 0;
		$cmd    = escapeshellarg( $binary_path ) . ' version 2>/dev/null';
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec
		@exec( $cmd, $output, $code );

		if ( 0 === $code && ! empty( $output[0] ) ) {
			// Parse version from output (e.g., "opencode 1.0.180" or just "1.0.180").
			$version_line = trim( $output[0] );
			if ( preg_match( '/(\d+\.\d+\.\d+)/', $version_line, $matches ) ) {
				return $matches[1];
			}
		}

		return null;
	}

	/**
	 * @return true|\WP_Error
	 */
	private static function extract_binary( string $archive_path, string $dest_dir ) {
		$os          = self::get_os();
		$binary_name = self::get_binary_name();
		$binary_path = $dest_dir . '/' . $binary_name;

		if ( file_exists( $binary_path ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink
			unlink( $binary_path );
		}

		if ( 'linux' === $os ) {
			$escaped_archive = escapeshellarg( $archive_path );
			$escaped_dest    = escapeshellarg( $dest_dir );

			$cmd    = "tar -xzf {$escaped_archive} -C {$escaped_dest} opencode 2>&1";
			$output = array();
			$code   = 0;
			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_exec
			exec( $cmd, $output, $code );

			if ( 0 !== $code ) {
				return new \WP_Error( 'extract_failed', 'Failed to extract tar.gz: ' . implode( "\n", $output ) );
			}
		} else {
			$zip = new \ZipArchive();
			if ( true !== $zip->open( $archive_path ) ) {
				return new \WP_Error( 'zip_open_failed', 'Could not open zip archive' );
			}

			$extracted = $zip->extractTo( $dest_dir, array( $binary_name ) );
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
				// phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink
				unlink( $file );
			}
		}

		$hidden = glob( $dir . '/.*' );
		foreach ( $hidden as $file ) {
			if ( is_file( $file ) ) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink
				unlink( $file );
			}
		}

		return rmdir( $dir );
	}

	/**
	 * Clear the cached release information.
	 */
	public static function clear_cache(): bool {
		return delete_transient( self::CACHE_KEY );
	}

	public static function get_platform_info(): array {
		return array(
			'os'             => self::get_os(),
			'arch'           => self::get_arch(),
			'target'         => self::get_target(),
			'archive_name'   => self::get_archive_name(),
			'binary_name'    => self::get_binary_name(),
			'binary_dir'     => self::get_binary_dir(),
			'binary_path'    => self::get_binary_path(),
			'is_installed'   => self::is_installed(),
			'version'        => self::get_installed_version(),
			'is_musl'        => self::is_musl(),
			'needs_baseline' => self::needs_baseline(),
			'php_uname_s'    => php_uname( 's' ),
			'php_uname_m'    => php_uname( 'm' ),
		);
	}
}
