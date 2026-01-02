<?php
/**
 * Exec capability detection for shared hosting environments.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

/**
 * Detects whether the hosting environment allows process execution.
 */
class ExecCapability {

	/**
	 * Cache the result to avoid repeated checks.
	 *
	 * @var bool|null
	 */
	private static ?bool $can_exec = null;

	/**
	 * Check if the environment can execute processes.
	 *
	 * Returns true if at least one process execution function is available.
	 * These functions are required to spawn and manage the OpenCode binary.
	 *
	 * @return bool Whether process execution is available.
	 */
	public static function can_exec(): bool {
		if ( null !== self::$can_exec ) {
			return self::$can_exec;
		}

		$disabled_functions = self::get_disabled_functions();

		// Check if any process execution function is available.
		$required_functions = array( 'exec', 'shell_exec', 'popen', 'proc_open' );

		foreach ( $required_functions as $func ) {
			if ( function_exists( $func ) && ! in_array( $func, $disabled_functions, true ) ) {
				self::$can_exec = true;
				return true;
			}
		}

		self::$can_exec = false;
		return false;
	}

	/**
	 * Get detailed capability information.
	 *
	 * @return array{
	 *     can_exec: bool,
	 *     available_functions: array<string>,
	 *     disabled_functions: array<string>,
	 *     has_posix: bool,
	 *     has_pcntl: bool
	 * }
	 */
	public static function get_capabilities(): array {
		$disabled_functions = self::get_disabled_functions();
		$exec_functions     = array( 'exec', 'shell_exec', 'popen', 'proc_open', 'passthru', 'system' );

		$available = array();
		$disabled  = array();

		foreach ( $exec_functions as $func ) {
			if ( function_exists( $func ) && ! in_array( $func, $disabled_functions, true ) ) {
				$available[] = $func;
			} else {
				$disabled[] = $func;
			}
		}

		return array(
			'can_exec'            => self::can_exec(),
			'available_functions' => $available,
			'disabled_functions'  => $disabled,
			'has_posix'           => function_exists( 'posix_kill' ),
			'has_pcntl'           => function_exists( 'pcntl_fork' ),
		);
	}

	/**
	 * Get list of disabled PHP functions.
	 *
	 * @return array<string> List of disabled function names.
	 */
	private static function get_disabled_functions(): array {
		$disabled = ini_get( 'disable_functions' );

		if ( false === $disabled || '' === $disabled ) {
			return array();
		}

		return array_map( 'trim', explode( ',', $disabled ) );
	}

	/**
	 * Reset the cached value (useful for testing).
	 *
	 * @return void
	 */
	public static function reset_cache(): void {
		self::$can_exec = null;
	}
}
