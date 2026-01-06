<?php

declare(strict_types=1);

namespace WordForge\Mcp;

use WP\MCP\Core\McpAdapter;
use WP\MCP\Transport\HttpTransport;
use WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler;
use WP\MCP\Abilities\DiscoverAbilitiesAbility;
use WP\MCP\Abilities\ExecuteAbilityAbility;
use WP\MCP\Abilities\GetAbilityInfoAbility;
use WordForge\AbilityRegistry;

class ServerManager {

	private const SERVER_ID = 'wordforge';

	/**
	 * Core abilities from the Abilities API that are always present.
	 */
	private const CORE_ABILITIES = array(
		'core/get-site-info',
		'core/get-user-info',
		'core/get-environment-info',
	);

	/**
	 * MCP Adapter abilities for dynamic ability discovery/execution.
	 */
	private const MCP_ADAPTER_ABILITIES = array(
		'mcp-adapter/discover-abilities',
		'mcp-adapter/execute-ability',
		'mcp-adapter/get-ability-info',
	);

	public function __construct() {
		if ( ! $this->is_mcp_adapter_available() ) {
			return;
		}

		$settings = \WordForge\get_settings();

		add_filter( 'mcp_adapter_create_default_server', '__return_false' );

		// Category must be registered on wp_abilities_api_categories_init.
		add_action( 'wp_abilities_api_categories_init', array( $this, 'register_mcp_adapter_category' ) );
		// Abilities must be registered on wp_abilities_api_init (after categories).
		add_action( 'wp_abilities_api_init', array( $this, 'register_mcp_adapter_abilities' ) );

		if ( ! $this->is_enabled( $settings ) ) {
			return;
		}

		add_action( 'mcp_adapter_init', array( $this, 'register_server' ) );
	}

	public function register_mcp_adapter_category(): void {
		if ( ! function_exists( 'wp_register_ability_category' ) ) {
			return;
		}

		wp_register_ability_category(
			'mcp-adapter',
			array(
				'label'       => 'MCP Adapter',
				'description' => 'Abilities for the MCP Adapter',
			)
		);
	}

	public function register_mcp_adapter_abilities(): void {
		if ( class_exists( DiscoverAbilitiesAbility::class ) ) {
			DiscoverAbilitiesAbility::register();
		}
		if ( class_exists( GetAbilityInfoAbility::class ) ) {
			GetAbilityInfoAbility::register();
		}
		if ( class_exists( ExecuteAbilityAbility::class ) ) {
			ExecuteAbilityAbility::register();
		}
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

		$tools   = $this->discover_wordforge_abilities_by_type( 'tool' );
		$prompts = $this->discover_wordforge_abilities_by_type( 'prompt' );

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
			$tools,
			array(),
			$prompts
		);
	}

	/**
	 * Discover WordForge abilities by MCP type.
	 *
	 * @param string $type The MCP type to filter by ('tool', 'resource', or 'prompt').
	 * @return array<string> Array of ability names matching the specified type.
	 */
	private function discover_wordforge_abilities_by_type( string $type ): array {
		$wordforge_names = AbilityRegistry::get_ability_names();
		$filtered        = array();

		foreach ( $wordforge_names as $name ) {
			$ability = wp_get_ability( $name );
			if ( ! $ability ) {
				continue;
			}

			$mcp_meta     = $ability->get_meta_item( 'mcp', array() );
			$ability_type = $mcp_meta['type'] ?? 'tool';

			if ( $ability_type === $type ) {
				$filtered[] = $name;
			}
		}

		if ( 'tool' === $type ) {
			$filtered = array_merge(
				array( 'core/get-site-info', 'core/get-environment-info' ),
				$filtered
			);

			// todo: This fck up gemini integration, some required fields not present. Should PR a fix on their repo.
			// if ( $this->has_external_abilities() ) {
			// $filtered = array_merge( self::MCP_ADAPTER_ABILITIES, $filtered );
			// }
		}

		return $filtered;
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

	private function has_external_abilities(): bool {
		$all_abilities = wp_get_abilities();
		$excluded      = array_merge( self::CORE_ABILITIES, self::MCP_ADAPTER_ABILITIES );

		foreach ( $all_abilities as $ability ) {
			if ( ! in_array( $ability->get_name(), $excluded, true ) ) {
				return true;
			}
		}

		return false;
	}
}
