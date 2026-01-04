<?php
/**
 * Detects configuration changes that affect OpenCode.
 *
 * Monitors plugins, themes, agents, and providers to detect changes
 * that require OpenCode server restart or desktop sync.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class ConfigChangeDetector {

	private const HASH_OPTION_KEY = 'wordforge_config_hash';

	/**
	 * Get the current configuration hash and its components.
	 *
	 * @return array{hash: string, components: array, generated: int}
	 */
	public static function get_config_hash(): array {
		$components = self::compute_components();
		$hash       = self::compute_composite_hash( $components );

		return array(
			'hash'       => $hash,
			'components' => $components,
			'generated'  => time(),
		);
	}

	/**
	 * Compute individual hash components.
	 *
	 * @return array{plugins_hash: string, theme_hash: string, agents_hash: string, providers_hash: string, woo_active: bool}
	 */
	public static function compute_components(): array {
		$theme = wp_get_theme();

		return array(
			'plugins_hash'   => md5( serialize( get_option( 'active_plugins', array() ) ) ),
			'theme_hash'     => md5( $theme->get( 'Name' ) . '|' . $theme->get( 'Version' ) ),
			'agents_hash'    => md5( serialize( AgentConfig::get_agents_for_display() ) ),
			'providers_hash' => md5( serialize( ProviderConfig::get_configured_providers() ) ),
			'woo_active'     => class_exists( 'WooCommerce' ),
		);
	}

	/**
	 * Compute composite hash from components.
	 *
	 * @param array $components Hash components.
	 * @return string Composite hash.
	 */
	public static function compute_composite_hash( array $components ): string {
		return md5( serialize( $components ) );
	}

	/**
	 * Get the stored (previous) config hash.
	 *
	 * @return string|null Previous hash or null if not stored.
	 */
	public static function get_stored_hash(): ?string {
		$stored = get_option( self::HASH_OPTION_KEY );
		return is_string( $stored ) && ! empty( $stored ) ? $stored : null;
	}

	/**
	 * Store the current config hash.
	 *
	 * @param string $hash Hash to store.
	 * @return bool Whether the hash was stored successfully.
	 */
	public static function store_hash( string $hash ): bool {
		return update_option( self::HASH_OPTION_KEY, $hash, false );
	}

	/**
	 * Check if configuration has changed since last check.
	 *
	 * @return bool True if config has changed.
	 */
	public static function has_config_changed(): bool {
		$stored  = self::get_stored_hash();
		$current = self::get_config_hash();

		if ( null === $stored ) {
			self::store_hash( $current['hash'] );
			return false;
		}

		return $stored !== $current['hash'];
	}

	/**
	 * Handle configuration change.
	 *
	 * Updates stored hash and restarts OpenCode server if running.
	 *
	 * @return void
	 */
	public static function on_config_changed(): void {
		$current = self::get_config_hash();
		self::store_hash( $current['hash'] );

		if ( ServerProcess::is_running() ) {
			self::restart_server();
		}
	}

	/**
	 * Restart the OpenCode server with fresh config.
	 *
	 * @return void
	 */
	private static function restart_server(): void {
		ServerProcess::stop();
		usleep( 300000 );

		$user = wp_get_current_user();
		if ( $user && $user->ID ) {
			$time = time();
			$data = array(
				'user_id' => $user->ID,
				'exp'     => $time + 3600,
				'iat'     => $time,
			);

			$payload   = base64_encode( wp_json_encode( $data ) );
			$signature = hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );
			$token     = $payload . '.' . $signature;

			ServerProcess::start(
				array(
					'mcp_auth_token' => $token,
				)
			);
		} else {
			ServerProcess::start( array() );
		}
	}

	/**
	 * Register WordPress hooks to detect config changes.
	 *
	 * @return void
	 */
	public static function register_hooks(): void {
		add_action( 'activated_plugin', array( self::class, 'handle_plugin_change' ), 10, 0 );
		add_action( 'deactivated_plugin', array( self::class, 'handle_plugin_change' ), 10, 0 );
		add_action( 'switch_theme', array( self::class, 'handle_theme_change' ), 10, 0 );
		add_action( 'upgrader_process_complete', array( self::class, 'handle_upgrade_complete' ), 10, 2 );
		add_action( 'wordforge_config_changed', array( self::class, 'on_config_changed' ), 10, 0 );
	}

	/**
	 * Handle plugin activation/deactivation.
	 *
	 * @return void
	 */
	public static function handle_plugin_change(): void {
		if ( self::has_config_changed() ) {
			self::on_config_changed();
		}
	}

	/**
	 * Handle theme switch.
	 *
	 * @return void
	 */
	public static function handle_theme_change(): void {
		if ( self::has_config_changed() ) {
			self::on_config_changed();
		}
	}

	/**
	 * Handle plugin/theme upgrades.
	 *
	 * @param \WP_Upgrader $upgrader Upgrader instance.
	 * @param array        $options  Upgrade options.
	 * @return void
	 */
	public static function handle_upgrade_complete( $upgrader, array $options ): void {
		$type = $options['type'] ?? '';

		if ( in_array( $type, array( 'plugin', 'theme' ), true ) ) {
			if ( self::has_config_changed() ) {
				self::on_config_changed();
			}
		}
	}
}
