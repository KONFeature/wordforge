<?php
/**
 * Agent prompts for OpenCode.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class AgentPrompts {

	public static function get_wordpress_manager_prompt( bool $local_mode = false, bool $is_remote_mcp = false ): string {
		$context  = ContextProvider::get_global_context();
		$is_local = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-manager.php';
		$prompt = ob_get_clean();

		return $is_remote_mcp ? $prompt : self::transform_tool_names_for_local( $prompt );
	}

	public static function get_content_creator_prompt( bool $local_mode = false, bool $is_remote_mcp = false ): string {
		$context  = ContextProvider::get_global_context();
		$is_local = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-content-creator.php';
		$prompt = ob_get_clean();

		return $is_remote_mcp ? $prompt : self::transform_tool_names_for_local( $prompt );
	}

	public static function get_commerce_manager_prompt( bool $local_mode = false, bool $is_remote_mcp = false ): string {
		$context  = ContextProvider::get_global_context();
		$is_local = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-commerce-manager.php';
		$prompt = ob_get_clean();

		return $is_remote_mcp ? $prompt : self::transform_tool_names_for_local( $prompt );
	}

	public static function get_auditor_prompt( bool $local_mode = false, bool $is_remote_mcp = false ): string {
		$context  = ContextProvider::get_global_context();
		$is_local = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-auditor.php';
		$prompt = ob_get_clean();

		return $is_remote_mcp ? $prompt : self::transform_tool_names_for_local( $prompt );
	}

	/**
	 * Transform tool names from remote MCP format (wordforge/xxx-yyy) to local format (wordpress_xxx_yyy).
	 *
	 * @param string $prompt The prompt text with tool names.
	 * @return string The prompt with transformed tool names.
	 */
	private static function transform_tool_names_for_local( string $prompt ): string {
		// Replace wordforge/xxx-yyy with wordpress_xxx_yyy
		return preg_replace_callback(
			'/wordforge\/([a-z-]+)/',
			function ( $matches ) {
				return 'wordpress_' . str_replace( '-', '_', $matches[1] );
			},
			$prompt
		);
	}
}
