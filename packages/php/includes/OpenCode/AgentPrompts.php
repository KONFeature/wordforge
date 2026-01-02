<?php
/**
 * Agent prompts for OpenCode.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class AgentPrompts {

	public static function get_wordpress_manager_prompt( bool $local_mode = false ): string {
		$context    = ContextProvider::get_global_context();
		$is_local   = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-manager.php';
		return ob_get_clean();
	}

	public static function get_content_creator_prompt( bool $local_mode = false ): string {
		$context    = ContextProvider::get_global_context();
		$is_local   = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-content-creator.php';
		return ob_get_clean();
	}

	public static function get_commerce_manager_prompt( bool $local_mode = false ): string {
		$context    = ContextProvider::get_global_context();
		$is_local   = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-commerce-manager.php';
		return ob_get_clean();
	}

	public static function get_auditor_prompt( bool $local_mode = false ): string {
		$context    = ContextProvider::get_global_context();
		$is_local   = $local_mode;

		ob_start();
		include __DIR__ . '/prompts/wordpress-auditor.php';
		return ob_get_clean();
	}
}
