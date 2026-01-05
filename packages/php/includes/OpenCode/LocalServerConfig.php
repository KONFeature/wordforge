<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class LocalServerConfig {

	private const TEMPLATES_DIR = __DIR__ . '/templates';
	private const USER_META_KEY = 'wordforge_local_devices';
	private const DEVICE_TTL    = 86400 * 7;

	public static function generate(): array {
		$config = array(
			'$schema'       => 'https://opencode.ai/config.json',
			'default_agent' => 'wordpress-manager',
			'instructions'  => array( '.opencode/context/site.md' ),
			'share'         => 'disabled',
			'permission'    => array(
				'edit'               => 'ask',
				'external_directory' => 'deny',
				'bash'               => array(
					'*' => 'ask',
				),
			),
		);

		$provider_config = ProviderConfig::get_opencode_provider_config();
		if ( ! empty( $provider_config ) ) {
			$config['provider'] = $provider_config;
		}

		$mcp_config = self::get_mcp_config();
		if ( $mcp_config ) {
			$config['mcp'] = array(
				'wordforge' => $mcp_config,
			);
		}

		return $config;
	}

	public static function write_config_files( string $base_dir ): bool {
		$opencode_dir = $base_dir . '/.opencode';
		$dirs         = array(
			$base_dir,
			$opencode_dir,
			$opencode_dir . '/agent',
			$opencode_dir . '/context',
		);

		foreach ( $dirs as $dir ) {
			if ( ! is_dir( $dir ) && ! mkdir( $dir, 0755, true ) ) {
				return false;
			}
		}

		$context  = ContextProvider::get_global_context();
		$is_local = true;

		$files = array(
			'AGENTS.md'                                    => self::render_template( self::TEMPLATES_DIR . '/agents-md.php', compact( 'context', 'is_local' ) ),
			'.opencode/context/site.md'                    => self::render_template( self::TEMPLATES_DIR . '/context/site.md.php', compact( 'context', 'is_local' ) ),
			'.opencode/agent/wordpress-manager.md'         => self::render_agent_template( 'wordpress-manager', $context, $is_local ),
			'.opencode/agent/wordpress-content-creator.md' => self::render_agent_template( 'wordpress-content-creator', $context, $is_local ),
			'.opencode/agent/wordpress-auditor.md'         => self::render_agent_template( 'wordpress-auditor', $context, $is_local ),
		);

		if ( class_exists( 'WooCommerce' ) ) {
			$files['.opencode/agent/wordpress-commerce-manager.md'] = self::render_agent_template( 'wordpress-commerce-manager', $context, $is_local );
		}

		foreach ( $files as $filename => $content ) {
			$filepath = $base_dir . '/' . $filename;
			if ( false === file_put_contents( $filepath, $content ) ) {
				return false;
			}
		}

		return true;
	}

	private static function render_template( string $template_path, array $vars ): string {
		extract( $vars, EXTR_SKIP );
		ob_start();
		include $template_path;
		return ob_get_clean();
	}

	private static function render_agent_template( string $agent_id, array $context, bool $is_local ): string {
		$model    = AgentConfig::get_model_for_agent( $agent_id );
		$template = self::TEMPLATES_DIR . '/agent/' . $agent_id . '.md.php';

		if ( ! file_exists( $template ) ) {
			return '';
		}

		return self::render_template( $template, compact( 'context', 'is_local', 'model' ) );
	}

	public static function generate_agents_md(): string {
		$context  = ContextProvider::get_global_context();
		$is_local = true;
		return self::render_template( self::TEMPLATES_DIR . '/agents-md.php', compact( 'context', 'is_local' ) );
	}

	public static function generate_site_context(): string {
		$context  = ContextProvider::get_global_context();
		$is_local = true;
		return self::render_template( self::TEMPLATES_DIR . '/context/site.md.php', compact( 'context', 'is_local' ) );
	}

	private static function get_mcp_config(): ?array {
		$app_password_data = AppPasswordManager::get_or_create();
		if ( ! $app_password_data ) {
			return null;
		}

		$mcp_url = \WordForge\get_endpoint_url();
		return array(
			'type'    => 'remote',
			'url'     => $mcp_url,
			'headers' => array(
				'Authorization' => 'Basic ' . $app_password_data['auth'],
			),
		);
	}

	public static function get_settings( ?int $user_id = null ): array {
		$user_id = $user_id ?? \get_current_user_id();
		$devices = self::get_user_devices( $user_id );
		$latest  = self::get_latest_device( $devices );

		return array(
			'port'        => $latest['port'] ?? 4096,
			'enabled'     => ! empty( $latest ),
			'device_id'   => $latest['device_id'] ?? null,
			'project_id'  => $latest['project_id'] ?? null,
			'project_dir' => $latest['project_dir'] ?? null,
			'devices'     => $devices,
		);
	}

	public static function save_settings( array $settings, ?int $user_id = null ): bool {
		$user_id   = $user_id ?? \get_current_user_id();
		$device_id = isset( $settings['device_id'] ) ? \sanitize_text_field( $settings['device_id'] ) : null;

		if ( empty( $device_id ) ) {
			return false;
		}

		$port = isset( $settings['port'] ) ? \absint( $settings['port'] ) : 4096;
		$port = max( 1024, min( 65535, $port ) );

		$device_data = array(
			'port'      => $port,
			'enabled'   => isset( $settings['enabled'] ) ? (bool) $settings['enabled'] : true,
			'last_seen' => time(),
		);

		if ( isset( $settings['project_id'] ) ) {
			$device_data['project_id'] = \sanitize_text_field( $settings['project_id'] );
		}

		if ( isset( $settings['project_dir'] ) ) {
			$device_data['project_dir'] = \sanitize_text_field( $settings['project_dir'] );
		}

		$devices               = self::get_user_devices( $user_id );
		$devices[ $device_id ] = $device_data;
		$devices               = self::cleanup_stale_devices( $devices );

		return (bool) \update_user_meta( $user_id, self::USER_META_KEY, $devices );
	}

	public static function get_port_for_device( string $device_id, ?int $user_id = null ): ?int {
		$user_id = $user_id ?? \get_current_user_id();
		$devices = self::get_user_devices( $user_id );

		if ( isset( $devices[ $device_id ] ) ) {
			return $devices[ $device_id ]['port'];
		}

		return null;
	}

	private static function get_user_devices( int $user_id ): array {
		$devices = \get_user_meta( $user_id, self::USER_META_KEY, true );
		return is_array( $devices ) ? $devices : array();
	}

	private static function get_latest_device( array $devices ): array {
		if ( empty( $devices ) ) {
			return array();
		}

		$latest    = null;
		$latest_id = null;

		foreach ( $devices as $device_id => $device ) {
			if ( null === $latest || ( $device['last_seen'] ?? 0 ) > ( $latest['last_seen'] ?? 0 ) ) {
				$latest    = $device;
				$latest_id = $device_id;
			}
		}

		if ( $latest ) {
			$latest['device_id'] = $latest_id;
		}

		return $latest ?? array();
	}

	private static function cleanup_stale_devices( array $devices ): array {
		$cutoff = time() - self::DEVICE_TTL;

		return array_filter(
			$devices,
			function ( $device ) use ( $cutoff ) {
				return ( $device['last_seen'] ?? 0 ) > $cutoff;
			}
		);
	}
}
