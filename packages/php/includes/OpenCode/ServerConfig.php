<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class ServerConfig {

	private const TEMPLATES_DIR = __DIR__ . '/templates';

	public static function generate( array $options, int $port ): array {
		$config = array(
			'$schema'       => 'https://opencode.ai/config.json',
			'instructions'  => array( 'context/site.md' ),
			'permission'    => array(
				'edit'               => 'deny',
				'external_directory' => 'deny',
				'bash'               => self::get_bash_permissions(),
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

		$is_remote_mcp = ! self::has_local_mcp_server();
		$context       = ContextProvider::get_global_context();

		$files = array(
			'AGENTS.md'                            => self::render_agents_md( $is_remote_mcp ),
			'context/site.md'                      => self::render_site_context( $context, false ),
			'agent/wordpress-manager.md'           => self::render_agent_template( 'wordpress-manager', $context, false, $is_remote_mcp ),
			'agent/wordpress-content-creator.md'   => self::render_agent_template( 'wordpress-content-creator', $context, false, $is_remote_mcp ),
			'agent/wordpress-auditor.md'           => self::render_agent_template( 'wordpress-auditor', $context, false, $is_remote_mcp ),
		);

		if ( class_exists( 'WooCommerce' ) ) {
			$files['agent/wordpress-commerce-manager.md'] = self::render_agent_template( 'wordpress-commerce-manager', $context, false, $is_remote_mcp );
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

	private static function render_agents_md( bool $is_remote_mcp ): string {
		$is_local = false;
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

	private static function has_local_mcp_server(): bool {
		$mcp_server_path = WORDFORGE_PLUGIN_DIR . 'assets/bin/wordforge-mcp.cjs';
		$runtime         = self::get_js_runtime();
		return file_exists( $mcp_server_path ) && $runtime;
	}

	public static function get_mcp_config(): ?array {
		$app_password_data = AppPasswordManager::get_or_create();
		if ( ! $app_password_data ) {
			return null;
		}

		$mcp_server_path = WORDFORGE_PLUGIN_DIR . 'assets/bin/wordforge-mcp.cjs';
		$abilities_url   = \rest_url( 'wp-abilities/v1' );
		$runtime         = self::get_js_runtime();

		if ( file_exists( $mcp_server_path ) && $runtime ) {
			return array(
				'type'        => 'local',
				'command'     => array( $runtime, $mcp_server_path ),
				'environment' => array(
					'WORDPRESS_URL'          => $abilities_url,
					'WORDPRESS_USERNAME'     => $app_password_data['username'],
					'WORDPRESS_APP_PASSWORD' => $app_password_data['password'],
				),
			);
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

	private static function get_js_runtime(): ?string {
		exec( 'which node 2>/dev/null', $node_output, $node_code );
		if ( 0 === $node_code ) {
			return 'node';
		}

		exec( 'which bun 2>/dev/null', $bun_output, $bun_code );
		if ( 0 === $bun_code ) {
			return 'bun';
		}

		return null;
	}

	private static function get_bash_permissions(): array {
		return array(
			'cat *'          => 'allow',
			'head *'         => 'allow',
			'tail *'         => 'allow',
			'less *'         => 'allow',
			'more *'         => 'allow',
			'grep *'         => 'allow',
			'rg *'           => 'allow',
			'find *'         => 'allow',
			'ls *'           => 'allow',
			'tree *'         => 'allow',
			'pwd'            => 'allow',
			'wc *'           => 'allow',
			'diff *'         => 'allow',
			'file *'         => 'allow',
			'stat *'         => 'allow',
			'du *'           => 'allow',
			'git status*'    => 'allow',
			'git log*'       => 'allow',
			'git diff*'      => 'allow',
			'git show*'      => 'allow',
			'git branch'     => 'allow',
			'git branch*'    => 'allow',
			'wp *'           => 'allow',
			'composer show*' => 'allow',
			'composer info*' => 'allow',
			'npm list*'      => 'allow',
			'npm ls*'        => 'allow',
			'bun pm ls*'     => 'allow',
			'curl'     => 'allow',
			'wget'     => 'allow',
			'ping'     => 'allow',
			'echo'     => 'allow',
			'php -r'     => 'allow',
			'php -l'     => 'allow',
			'date'     => 'allow',
			'ps aux'     => 'allow',
			'systemctl status'     => 'allow',
			'*'              => 'deny',
		);
	}
}
