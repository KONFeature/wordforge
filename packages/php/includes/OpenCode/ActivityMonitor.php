<?php
/**
 * Activity Monitor for OpenCode server.
 *
 * Tracks server activity to enable automatic shutdown after inactivity.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class ActivityMonitor {

	private const OPTION_NAME       = 'wordforge_opencode_last_activity';
	private const DEFAULT_THRESHOLD = 1800; // 30 minutes in seconds
	private const CRON_HOOK         = 'wordforge_check_opencode_activity';
	private const CRON_INTERVAL     = 'wordforge_every_5_minutes';

	/**
	 * Update the last activity timestamp to current time.
	 */
	public static function record_activity(): void {
		update_option( self::OPTION_NAME, time(), false );
	}

	/**
	 * Get the last activity timestamp.
	 *
	 * @return int|null Unix timestamp of last activity, or null if never recorded.
	 */
	public static function get_last_activity(): ?int {
		$timestamp = get_option( self::OPTION_NAME );

		if ( false === $timestamp || '' === $timestamp ) {
			return null;
		}

		return (int) $timestamp;
	}

	/**
	 * Get seconds since last activity.
	 *
	 * @return int|null Seconds since last activity, or null if never recorded.
	 */
	public static function get_seconds_since_activity(): ?int {
		$last_activity = self::get_last_activity();

		if ( null === $last_activity ) {
			return null;
		}

		return time() - $last_activity;
	}

	/**
	 * Check if server has been inactive for threshold duration.
	 *
	 * @return bool True if inactive beyond threshold, false otherwise.
	 */
	public static function is_inactive(): bool {
		$seconds_since = self::get_seconds_since_activity();

		if ( null === $seconds_since ) {
			// Never recorded activity, consider it inactive.
			return true;
		}

		return $seconds_since >= self::get_inactivity_threshold();
	}

	/**
	 * Clear activity timestamp (called when server stops).
	 */
	public static function clear_activity(): void {
		delete_option( self::OPTION_NAME );
	}

	/**
	 * Get configurable inactivity threshold in seconds.
	 *
	 * Uses settings value, falls back to default, filterable via wordforge_inactivity_threshold.
	 *
	 * @return int Threshold in seconds.
	 */
	public static function get_inactivity_threshold(): int {
		$settings  = \WordForge\get_settings();
		$threshold = $settings['auto_shutdown_threshold'] ?? self::DEFAULT_THRESHOLD;

		/**
		 * Filter the inactivity threshold.
		 *
		 * @param int $threshold Threshold in seconds.
		 */
		return (int) apply_filters( 'wordforge_inactivity_threshold', $threshold );
	}

	/**
	 * Check if auto-shutdown is enabled in settings.
	 *
	 * @return bool True if enabled, false otherwise.
	 */
	public static function is_auto_shutdown_enabled(): bool {
		$settings = \WordForge\get_settings();
		return (bool) ( $settings['auto_shutdown_enabled'] ?? true );
	}

	/**
	 * Get the cron hook name.
	 *
	 * @return string Cron hook name.
	 */
	public static function get_cron_hook(): string {
		return self::CRON_HOOK;
	}

	/**
	 * Get the cron interval name.
	 *
	 * @return string Cron interval name.
	 */
	public static function get_cron_interval(): string {
		return self::CRON_INTERVAL;
	}

	/**
	 * Schedule the activity check cron job.
	 */
	public static function schedule_cron(): void {
		if ( ! self::is_auto_shutdown_enabled() ) {
			self::unschedule_cron();
			return;
		}

		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time(), self::CRON_INTERVAL, self::CRON_HOOK );
		}
	}

	/**
	 * Unschedule the activity check cron job.
	 */
	public static function unschedule_cron(): void {
		$timestamp = wp_next_scheduled( self::CRON_HOOK );

		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, self::CRON_HOOK );
		}
	}

	/**
	 * Check server activity and stop if inactive.
	 *
	 * This is the cron callback.
	 */
	public static function check_and_stop_if_inactive(): void {
		if ( ! self::is_auto_shutdown_enabled() ) {
			return;
		}

		if ( ! ServerProcess::is_running() ) {
			return;
		}

		if ( self::is_inactive() ) {
			$seconds = self::get_seconds_since_activity();
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log(
				sprintf(
					'WordForge: Stopping OpenCode server due to %d minutes of inactivity',
					$seconds ? (int) floor( $seconds / 60 ) : 0
				)
			);
			ServerProcess::stop();
		}
	}

	/**
	 * Get activity status for API responses.
	 *
	 * @return array{last_activity: int|null, seconds_inactive: int|null, threshold: int, is_inactive: bool, auto_shutdown_enabled: bool, will_shutdown_in: int|null}
	 */
	public static function get_status(): array {
		$seconds_inactive = self::get_seconds_since_activity();
		$threshold        = self::get_inactivity_threshold();
		$is_running       = ServerProcess::is_running();

		$will_shutdown_in = null;
		if ( $is_running && null !== $seconds_inactive && self::is_auto_shutdown_enabled() ) {
			$will_shutdown_in = max( 0, $threshold - $seconds_inactive );
		}

		return array(
			'last_activity'         => self::get_last_activity(),
			'seconds_inactive'      => $seconds_inactive,
			'threshold'             => $threshold,
			'is_inactive'           => self::is_inactive(),
			'auto_shutdown_enabled' => self::is_auto_shutdown_enabled(),
			'will_shutdown_in'      => $will_shutdown_in,
		);
	}
}
