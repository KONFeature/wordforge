<?php

declare(strict_types=1);

namespace WordForge\OpenCode;

class ServerConfig {

	public static function generate( array $options, int $port ): array {
		$agents = self::build_agents_config();

		$config = [
			'$schema'       => 'https://opencode.ai/config.json',
			'default_agent' => 'wordpress-manager',
			'agent'         => $agents,
			'permission'    => [
				'edit'               => 'deny',
				'external_directory' => 'deny',
				'bash'               => self::get_bash_permissions(),
			],
		];

		$provider_config = ProviderConfig::get_opencode_provider_config();
		if ( ! empty( $provider_config ) ) {
			$config['provider'] = $provider_config;
		}

		$mcp_config = self::get_mcp_config();
		if ( $mcp_config ) {
			$config['mcp'] = [
				'wordforge' => $mcp_config,
			];
		}

		return $config;
	}

	private static function build_agents_config(): array {
		$agents = [
			'wordpress-manager'         => [
				'mode'        => 'primary',
				'model'       => AgentConfig::get_effective_model( 'wordpress-manager' ),
				'description' => 'WordPress site orchestrator - delegates to specialized subagents for content, commerce, and auditing',
				'prompt'      => AgentPrompts::get_wordpress_manager_prompt(),
				'color'       => '#3858E9',
			],
			'wordpress-content-creator' => [
				'mode'        => 'subagent',
				'model'       => AgentConfig::get_effective_model( 'wordpress-content-creator' ),
				'description' => 'Content creation specialist - blog posts, landing pages, legal pages with SEO optimization',
				'prompt'      => AgentPrompts::get_content_creator_prompt(),
				'color'       => '#10B981',
			],
			'wordpress-auditor'         => [
				'mode'        => 'subagent',
				'model'       => AgentConfig::get_effective_model( 'wordpress-auditor' ),
				'description' => 'Site analysis specialist - SEO audits, content reviews, performance recommendations',
				'prompt'      => AgentPrompts::get_auditor_prompt(),
				'color'       => '#F59E0B',
			],
		];

		if ( class_exists( 'WooCommerce' ) ) {
			$agents['wordpress-commerce-manager'] = [
				'mode'        => 'subagent',
				'model'       => AgentConfig::get_effective_model( 'wordpress-commerce-manager' ),
				'description' => 'WooCommerce specialist - product management, inventory, pricing',
				'prompt'      => AgentPrompts::get_commerce_manager_prompt(),
				'color'       => '#8B5CF6',
			];
		}

		return $agents;
	}

	public static function get_mcp_config(): ?array {
		$app_password_data = AppPasswordManager::get_or_create();
		if ( ! $app_password_data ) {
			return null;
		}

		$mcp_server_path = WORDFORGE_PLUGIN_DIR . 'assets/bin/wordforge-mcp.cjs';
		$abilities_url   = rest_url( 'wp-abilities/v1' );
		$runtime         = self::get_js_runtime();

		if ( file_exists( $mcp_server_path ) && $runtime ) {
			return [
				'type'        => 'local',
				'command'     => [ $runtime, $mcp_server_path ],
				'environment' => [
					'WORDPRESS_URL'          => $abilities_url,
					'WORDPRESS_USERNAME'     => $app_password_data['username'],
					'WORDPRESS_APP_PASSWORD' => $app_password_data['password'],
				],
			];
		}

		$mcp_url = \WordForge\get_endpoint_url();
		return [
			'type'    => 'remote',
			'url'     => $mcp_url,
			'headers' => [
				'Authorization' => 'Basic ' . $app_password_data['auth'],
			],
		];
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
		return [
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
			'*'              => 'deny',
		];
	}
}
