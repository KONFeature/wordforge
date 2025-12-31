<?php
/**
 * Agent prompts for OpenCode.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class AgentPrompts {

	/**
	 * @return string The wordpress-manager agent prompt with injected context.
	 */
	public static function get_wordpress_manager_prompt(): string {
		$context = ContextProvider::get_global_context();

		ob_start();
		include __DIR__ . '/prompts/wordpress-manager.php';
		return ob_get_clean();
	}
}
