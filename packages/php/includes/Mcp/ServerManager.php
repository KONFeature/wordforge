<?php

declare(strict_types=1);

namespace WordForge\Mcp;

use WP\MCP\Core\McpAdapter;
use WP\MCP\Transport\HttpTransport;

class ServerManager {

	private const SERVER_ID = 'wordforge';

	public function __construct() {
		if ( ! $this->is_mcp_adapter_available() ) {
			return;
		}

		$settings = \WordForge\get_settings();

		if ( ! $this->is_enabled( $settings ) ) {
			add_filter( 'mcp_adapter_create_default_server', '__return_false' );
			return;
		}

		add_filter( 'mcp_adapter_default_server_config', [ $this, 'configure_server' ] );
	}

	private function is_mcp_adapter_available(): bool {
		return class_exists( McpAdapter::class );
	}

	private function is_enabled( array $settings ): bool {
		return (bool) ( $settings['mcp_enabled'] ?? true );
	}

	public function configure_server( array $config ): array {
		$settings = \WordForge\get_settings();

		$config['server_id']              = self::SERVER_ID;
		$config['server_route_namespace'] = $settings['mcp_namespace'] ?? 'wordforge';
		$config['server_route']           = $settings['mcp_route'] ?? 'mcp';
		$config['server_name']            = __( 'WordForge MCP Server', 'wordforge' );
		$config['server_description']     = __( 'WordPress content management, styling, and commerce via MCP', 'wordforge' );
		$config['server_version']         = WORDFORGE_VERSION;

		return $config;
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
