<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class ServerConfig {

	private const TEMPLATES_DIR = __DIR__ . '/templates';

	public static function generate( array $options, int $port ): array {
		$config = array(
			'$schema'       => 'https://opencode.ai/config.json',
			'default_agent' => 'wordpress-manager',
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

		$context  = ContextProvider::get_global_context();
		$is_local = false;

		$files = array(
			'AGENTS.md'                          => self::render_template( self::TEMPLATES_DIR . '/agents-md.php', compact( 'context', 'is_local' ) ),
			'context/site.md'                    => self::render_template( self::TEMPLATES_DIR . '/context/site.md.php', compact( 'context', 'is_local' ) ),
			'agent/wordpress-manager.md'         => self::render_agent_template( 'wordpress-manager', $context, $is_local ),
			'agent/wordpress-content-creator.md' => self::render_agent_template( 'wordpress-content-creator', $context, $is_local ),
			'agent/wordpress-auditor.md'         => self::render_agent_template( 'wordpress-auditor', $context, $is_local ),
		);

		if ( class_exists( 'WooCommerce' ) ) {
			$files['agent/wordpress-commerce-manager.md'] = self::render_agent_template( 'wordpress-commerce-manager', $context, $is_local );
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

	public static function get_mcp_config(): ?array {
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

	private static function get_bash_permissions(): array {
		return array(
			'cat *'            => 'allow',
			'head *'           => 'allow',
			'tail *'           => 'allow',
			'less *'           => 'allow',
			'more *'           => 'allow',
			'grep *'           => 'allow',
			'rg *'             => 'allow',
			'find *'           => 'allow',
			'ls *'             => 'allow',
			'tree *'           => 'allow',
			'pwd'              => 'allow',
			'wc *'             => 'allow',
			'diff *'           => 'allow',
			'file *'           => 'allow',
			'stat *'           => 'allow',
			'du *'             => 'allow',
			'git status*'      => 'allow',
			'git log*'         => 'allow',
			'git diff*'        => 'allow',
			'git show*'        => 'allow',
			'git branch'       => 'allow',
			'git branch*'      => 'allow',
			'wp *'             => 'allow',
			'composer show*'   => 'allow',
			'composer info*'   => 'allow',
			'npm list*'        => 'allow',
			'npm ls*'          => 'allow',
			'bun pm ls*'       => 'allow',
			'curl'             => 'allow',
			'wget'             => 'allow',
			'ping'             => 'allow',
			'echo'             => 'allow',
			'php -r'           => 'allow',
			'php -l'           => 'allow',
			'date'             => 'allow',
			'ps aux'           => 'allow',
			'systemctl status' => 'allow',
			'*'                => 'deny',
		);
	}
}
