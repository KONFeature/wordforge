<?php

declare(strict_types=1);

namespace WordForge\Admin;

class MenuManager {

	public const MENU_SLUG = 'wordforge';
	public const CHAT_SLUG = 'wordforge-chat';

	public function __construct() {
		add_action( 'admin_menu', [ $this, 'register_menu' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_shared_assets' ] );
	}

	public function register_menu(): void {
		add_menu_page(
			__( 'WordForge', 'wordforge' ),
			__( 'WordForge (IA)', 'wordforge' ),
			'manage_options',
			self::MENU_SLUG,
			[ $this, 'render_settings_page' ],
			'dashicons-hammer',
			30
		);

		// First submenu replaces the auto-generated "WordForge" item with "Settings".
		add_submenu_page(
			self::MENU_SLUG,
			__( 'Settings', 'wordforge' ),
			__( 'Settings', 'wordforge' ),
			'manage_options',
			self::MENU_SLUG,
			[ $this, 'render_settings_page' ]
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Chat', 'wordforge' ),
			__( 'Chat', 'wordforge' ),
			'manage_options',
			self::CHAT_SLUG,
			[ $this, 'render_chat_page' ]
		);
	}

	public function render_settings_page(): void {
		$page = new SettingsPage();
		$page->render();
	}

	public function render_chat_page(): void {
		$page = new ChatPage();
		$page->render();
	}

	public function enqueue_shared_assets( string $hook ): void {
		if ( ! $this->is_wordforge_page( $hook ) ) {
			return;
		}

		wp_add_inline_style( 'common', $this->get_shared_styles() );
	}

	private function is_wordforge_page( string $hook ): bool {
		return in_array(
			$hook,
			[
				'toplevel_page_' . self::MENU_SLUG,
				'wordforge-ia_page_' . self::CHAT_SLUG,
			],
			true
		);
	}

	private function get_shared_styles(): string {
		return '
			.wordforge-wrap { max-width: 1200px; }
			.wordforge-wrap h1 { display: flex; align-items: center; gap: 8px; }
			.wordforge-wrap .wordforge-logo { font-size: 1.3em; }
			.wordforge-tagline { font-size: 1.1em; color: #646970; margin-bottom: 24px; }

			.wordforge-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
			.wordforge-card { background: #fff; border: 1px solid #c3c4c7; border-radius: 4px; padding: 20px; }
			.wordforge-card h2 { margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid #f0f0f1; font-size: 14px; }
			.wordforge-card h3 { font-size: 13px; margin: 16px 0 8px; }
			.wordforge-card-wide { grid-column: 1 / -1; }

			.wordforge-form-table { margin: 0; }
			.wordforge-form-table th { padding: 12px 0; width: 120px; }
			.wordforge-form-table td { padding: 12px 0; }
			.wordforge-form-table .regular-text { width: 100%; max-width: 300px; }

			.wordforge-status-table { width: 100%; border-collapse: collapse; }
			.wordforge-status-table td { padding: 8px 0; border-bottom: 1px solid #f0f0f1; }
			.wordforge-status-table td:first-child { font-weight: 500; width: 140px; }
			.wordforge-status-table code { background: #f0f0f1; padding: 2px 6px; border-radius: 3px; font-size: 12px; word-break: break-all; }

			.wordforge-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 500; text-transform: uppercase; }
			.wordforge-badge-success { background: #d4edda; color: #155724; }
			.wordforge-badge-error { background: #f8d7da; color: #721c24; }
			.wordforge-badge-warning { background: #fff3cd; color: #856404; }
			.wordforge-badge-neutral { background: #e9ecef; color: #495057; }

			.wordforge-abilities-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
			.wordforge-ability-group h3 { margin: 0 0 12px; font-size: 14px; color: #1d2327; display: flex; align-items: center; gap: 8px; }
			.wordforge-ability-group ul { margin: 0; padding: 0; list-style: none; }
			.wordforge-ability-group li { padding: 6px 0; border-bottom: 1px solid #f0f0f1; }
			.wordforge-ability-group li:last-child { border-bottom: none; }
			.wordforge-ability-group code { font-size: 11px; background: #f6f7f7; padding: 2px 6px; border-radius: 3px; }
			.wordforge-ability-desc { display: block; font-size: 12px; color: #646970; margin-top: 2px; }

			.wordforge-code-block { background: #1d2327; color: #50c878; padding: 12px; border-radius: 4px; font-size: 11px; overflow-x: auto; white-space: pre; }
			.wordforge-notice-warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 0 0 16px; }
			.wordforge-notice-info { background: #e7f3ff; border-left: 4px solid #2271b1; padding: 12px; margin: 0 0 16px; }

			.wordforge-doc-links { margin: 8px 0 0; padding-left: 0; list-style: none; }
			.wordforge-doc-links li { margin: 4px 0; }
			.wordforge-doc-links a { text-decoration: none; color: #2271b1; }
			.wordforge-doc-links a:hover { color: #135e96; text-decoration: underline; }

			.wordforge-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
			.wordforge-actions .button .dashicons { margin-right: 4px; line-height: 1.4; vertical-align: middle; }
		';
	}
}
