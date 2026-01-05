<?php

declare(strict_types=1);

namespace WordForge\Mcp;

use WP\MCP\Core\McpAdapter;
use WP\MCP\Transport\HttpTransport;
use WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler;
use WordForge\AbilityRegistry;

class ServerManager {

	private const SERVER_ID = 'wordforge';

	public function __construct() {
		if ( ! $this->is_mcp_adapter_available() ) {
			return;
		}

		$settings = \WordForge\get_settings();

		add_filter( 'mcp_adapter_create_default_server', '__return_false' );

		if ( ! $this->is_enabled( $settings ) ) {
			return;
		}

		add_action( 'mcp_adapter_init', array( $this, 'register_server' ) );
	}

	private function is_mcp_adapter_available(): bool {
		return class_exists( McpAdapter::class );
	}

	private function is_enabled( array $settings ): bool {
		return (bool) ( $settings['mcp_enabled'] ?? true );
	}

	public function register_server( McpAdapter $adapter ): void {
		$settings = \WordForge\get_settings();

		$namespace = $settings['mcp_namespace'] ?? 'wordforge';
		$route     = $settings['mcp_route'] ?? 'mcp';

		$abilities = $this->get_registered_abilities();

		$adapter->create_server(
			self::SERVER_ID,
			$namespace,
			$route,
			__( 'WordForge MCP Server', 'wordforge' ),
			__( 'AI-powered WordPress content management, styling, and commerce via MCP', 'wordforge' ),
			WORDFORGE_VERSION,
			array( HttpTransport::class ),
			ErrorLogMcpErrorHandler::class,
			null,
			$abilities['tools'],
			array(),
			$abilities['prompts']
		);
	}

	private function get_registered_abilities(): array {
		$all_names = AbilityRegistry::get_ability_names();

		$tools   = array();
		$prompts = array();

		foreach ( $all_names as $name ) {
			$ability = wp_get_ability( $name );

			if ( ! $ability ) {
				continue;
			}

			$mcp_meta = $ability->get_meta_item( 'mcp', array() );
			$mcp_type = $mcp_meta['type'] ?? 'tool';

			if ( 'prompt' === $mcp_type ) {
				$prompts[] = $name;
			} else {
				$tools[] = $name;
			}
		}

		return array(
			'tools'   => $tools,
			'prompts' => $prompts,
		);
	}

	public static function get_endpoint_url( ?array $settings = null ): string {
		if ( null === $settings ) {
			$settings = \WordForge\get_settings();
		}

		$namespace = $settings['mcp_namespace'] ?? 'wordforge';
		$route     = $settings['mcp_route'] ?? 'mcp';

		return rest_url( $namespace . '/' . $route );
	}

	public static function get_server_id(): string {
		return self::SERVER_ID;
	}
}
