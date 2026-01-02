<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class LocalServerConfig {

	public const RUNTIME_NODE = 'node';
	public const RUNTIME_BUN  = 'bun';
	public const RUNTIME_NONE = 'none';

	private const TEMPLATES_DIR = __DIR__ . '/templates';

	public static function generate( string $runtime = self::RUNTIME_NODE ): array {
		$config = array(
			'$schema'      => 'https://opencode.ai/config.json',
			'instructions' => array( 'context/site.md' ),
			'permission'   => array(
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

		$mcp_config = self::get_mcp_config( $runtime );
		if ( $mcp_config ) {
			$config['mcp'] = array(
				'wordforge' => $mcp_config,
			);
		}

		return $config;
	}

	public static function write_config_files( string $base_dir, string $runtime = self::RUNTIME_NODE ): bool {
		$dirs = array(
			$base_dir,
			$base_dir . '/agent',
			$base_dir . '/context',
		);

		foreach ( $dirs as $dir ) {
			if ( ! is_dir( $dir ) && ! mkdir( $dir, 0755, true ) ) {
				return false;
			}
		}

		$is_remote_mcp = self::RUNTIME_NONE === $runtime;
		$is_local      = true;
		$context       = ContextProvider::get_global_context();

		$files = array(
			'AGENTS.md'                            => self::render_agents_md( $is_local, $is_remote_mcp ),
			'context/site.md'                      => self::render_site_context( $context, $is_local ),
			'agent/wordpress-manager.md'           => self::render_agent_template( 'wordpress-manager', $context, $is_local, $is_remote_mcp ),
			'agent/wordpress-content-creator.md'   => self::render_agent_template( 'wordpress-content-creator', $context, $is_local, $is_remote_mcp ),
			'agent/wordpress-auditor.md'           => self::render_agent_template( 'wordpress-auditor', $context, $is_local, $is_remote_mcp ),
		);

		if ( class_exists( 'WooCommerce' ) ) {
			$files['agent/wordpress-commerce-manager.md'] = self::render_agent_template( 'wordpress-commerce-manager', $context, $is_local, $is_remote_mcp );
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
		$content = ob_get_clean();

		$is_local = $vars['is_local'] ?? false;
		return self::transform_ability_names( $content, $is_local );
	}

	private static function transform_ability_names( string $content, bool $is_local ): string {
		if ( ! $is_local ) {
			return $content;
		}

		return str_replace( '`wordforge/', '`wordpress_', $content );
	}

	private static function render_agents_md( bool $is_local, bool $is_remote_mcp ): string {
		return self::render_template(
			self::TEMPLATES_DIR . '/agents-md.php',
			compact( 'is_local', 'is_remote_mcp' )
		);
	}

	private static function render_site_context( array $context, bool $is_local ): string {
		return self::render_template(
			self::TEMPLATES_DIR . '/context/site.md.php',
			compact( 'context', 'is_local' )
		);
	}

	private static function render_agent_template( string $agent_id, array $context, bool $is_local, bool $is_remote_mcp ): string {
		$model    = AgentConfig::get_model_for_agent( $agent_id );
		$template = self::TEMPLATES_DIR . '/agent/' . $agent_id . '.md.php';

		if ( ! file_exists( $template ) ) {
			return '';
		}

		return self::render_template(
			$template,
			compact( 'context', 'is_local', 'is_remote_mcp', 'model' )
		);
	}

	public static function generate_agents_md( string $runtime = self::RUNTIME_NODE ): string {
		$is_local      = true;
		$is_remote_mcp = self::RUNTIME_NONE === $runtime;
		return self::render_agents_md( $is_local, $is_remote_mcp );
	}

	public static function generate_site_context( string $runtime = self::RUNTIME_NODE ): string {
		$context  = ContextProvider::get_global_context();
		$is_local = true;
		return self::render_site_context( $context, $is_local );
	}

	private static function get_mcp_config( string $runtime ): ?array {
		$app_password_data = AppPasswordManager::get_or_create();
		if ( ! $app_password_data ) {
			return null;
		}

		if ( self::RUNTIME_NONE === $runtime ) {
			$mcp_url = \WordForge\get_endpoint_url();
			return array(
				'type'    => 'remote',
				'url'     => $mcp_url,
				'headers' => array(
					'Authorization' => 'Basic ' . $app_password_data['auth'],
				),
			);
		}

		$abilities_url = \rest_url( 'wp-abilities/v1' );
		return array(
			'type'        => 'local',
			'command'     => array( $runtime, './wordforge-mcp.cjs' ),
			'environment' => array(
				'WORDPRESS_URL'          => $abilities_url,
				'WORDPRESS_USERNAME'     => $app_password_data['username'],
				'WORDPRESS_APP_PASSWORD' => $app_password_data['password'],
			),
		);
	}

	public static function get_settings(): array {
		$settings = \get_option( 'wordforge_local_server', array() );

		return array(
			'port'    => $settings['port'] ?? 4096,
			'enabled' => $settings['enabled'] ?? true,
			'runtime' => $settings['runtime'] ?? self::RUNTIME_NODE,
		);
	}

	public static function save_settings( array $settings ): bool {
		$existing  = self::get_settings();
		$sanitized = array(
			'port'    => isset( $settings['port'] ) ? \absint( $settings['port'] ) : $existing['port'],
			'enabled' => isset( $settings['enabled'] ) ? (bool) $settings['enabled'] : $existing['enabled'],
			'runtime' => isset( $settings['runtime'] ) ? \sanitize_text_field( $settings['runtime'] ) : $existing['runtime'],
		);

		$sanitized['port'] = max( 1024, min( 65535, $sanitized['port'] ) );

		$valid_runtimes = array( self::RUNTIME_NODE, self::RUNTIME_BUN, self::RUNTIME_NONE );
		if ( ! in_array( $sanitized['runtime'], $valid_runtimes, true ) ) {
			$sanitized['runtime'] = self::RUNTIME_NODE;
		}

		return \update_option( 'wordforge_local_server', $sanitized, false );
	}

	public static function get_mcp_server_binary_path(): ?string {
		$binary_path = WORDFORGE_PLUGIN_DIR . 'assets/bin/wordforge-mcp.cjs';
		return file_exists( $binary_path ) ? $binary_path : null;
	}
}
