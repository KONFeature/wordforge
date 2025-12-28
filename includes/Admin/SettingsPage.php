<?php

declare(strict_types=1);

namespace WordForge\Admin;

class SettingsPage {

    public function __construct() {
        add_action( 'admin_menu', [ $this, 'add_menu_page' ] );
        add_action( 'admin_init', [ $this, 'register_settings' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_styles' ] );
    }

    public function add_menu_page(): void {
        add_options_page(
            __( 'WordForge', 'wordforge' ),
            __( 'WordForge', 'wordforge' ),
            'manage_options',
            'wordforge',
            [ $this, 'render_page' ]
        );
    }

    public function register_settings(): void {
        register_setting( 'wordforge_settings', 'wordforge_settings', [
            'type'              => 'array',
            'sanitize_callback' => [ $this, 'sanitize_settings' ],
            'default'           => [
                'namespace' => 'wordforge/v1',
                'route'     => 'mcp',
            ],
        ] );
    }

    public function sanitize_settings( array $input ): array {
        return [
            'namespace' => sanitize_text_field( $input['namespace'] ?? 'wordforge/v1' ),
            'route'     => sanitize_text_field( $input['route'] ?? 'mcp' ),
        ];
    }

    public function enqueue_styles( string $hook ): void {
        if ( 'settings_page_wordforge' !== $hook ) {
            return;
        }
        wp_add_inline_style( 'common', $this->get_inline_styles() );
    }

    public function render_page(): void {
        $mcp_active = class_exists( 'WP\\MCP\\Core\\McpAdapter' );
        $woo_active = \WordForge\is_woocommerce_active();
        $settings = \WordForge\get_settings();
        $abilities = $this->get_registered_abilities();
        ?>
        <div class="wrap wordforge-settings">
            <h1>
                <span class="wordforge-logo">⚒️</span>
                <?php esc_html_e( 'WordForge', 'wordforge' ); ?>
            </h1>
            
            <p class="wordforge-tagline">
                <?php esc_html_e( 'Forge your WordPress site through conversation.', 'wordforge' ); ?>
            </p>

            <div class="wordforge-cards">
                <?php $this->render_status_card( $mcp_active, $woo_active ); ?>
                <?php $this->render_endpoint_settings_card( $settings ); ?>
                <?php $this->render_abilities_card( $abilities, $woo_active ); ?>
                <?php $this->render_connection_card( $settings ); ?>
            </div>
        </div>
        <?php
    }

    private function render_status_card( bool $mcp_active, bool $woo_active ): void {
        ?>
        <div class="wordforge-card">
            <h2><?php esc_html_e( 'Status', 'wordforge' ); ?></h2>
            
            <table class="wordforge-status-table">
                <tr>
                    <td><?php esc_html_e( 'MCP Adapter', 'wordforge' ); ?></td>
                    <td>
                        <?php if ( $mcp_active ) : ?>
                            <span class="wordforge-badge wordforge-badge-success">
                                <?php esc_html_e( 'Active', 'wordforge' ); ?>
                            </span>
                        <?php else : ?>
                            <span class="wordforge-badge wordforge-badge-error">
                                <?php esc_html_e( 'Not Found', 'wordforge' ); ?>
                            </span>
                            <br><small>
                                <a href="https://github.com/WordPress/mcp-adapter" target="_blank">
                                    <?php esc_html_e( 'Install MCP Adapter', 'wordforge' ); ?>
                                </a>
                            </small>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <td><?php esc_html_e( 'WooCommerce', 'wordforge' ); ?></td>
                    <td>
                        <?php if ( $woo_active ) : ?>
                            <span class="wordforge-badge wordforge-badge-success">
                                <?php esc_html_e( 'Active', 'wordforge' ); ?>
                            </span>
                        <?php else : ?>
                            <span class="wordforge-badge wordforge-badge-neutral">
                                <?php esc_html_e( 'Not Installed', 'wordforge' ); ?>
                            </span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <td><?php esc_html_e( 'Version', 'wordforge' ); ?></td>
                    <td><code><?php echo esc_html( WORDFORGE_VERSION ); ?></code></td>
                </tr>
            </table>
        </div>
        <?php
    }

    private function render_endpoint_settings_card( array $settings ): void {
        ?>
        <div class="wordforge-card">
            <h2><?php esc_html_e( 'Endpoint Settings', 'wordforge' ); ?></h2>
            
            <form method="post" action="options.php">
                <?php settings_fields( 'wordforge_settings' ); ?>
                
                <table class="form-table wordforge-form-table">
                    <tr>
                        <th><label for="wordforge_namespace"><?php esc_html_e( 'Namespace', 'wordforge' ); ?></label></th>
                        <td>
                            <input type="text" id="wordforge_namespace" name="wordforge_settings[namespace]" 
                                   value="<?php echo esc_attr( $settings['namespace'] ); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e( 'REST API namespace (e.g., wordforge/v1)', 'wordforge' ); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="wordforge_route"><?php esc_html_e( 'Route', 'wordforge' ); ?></label></th>
                        <td>
                            <input type="text" id="wordforge_route" name="wordforge_settings[route]" 
                                   value="<?php echo esc_attr( $settings['route'] ); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e( 'MCP endpoint route (e.g., mcp)', 'wordforge' ); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e( 'Full Endpoint', 'wordforge' ); ?></th>
                        <td>
                            <code id="wordforge_full_endpoint"><?php echo esc_html( \WordForge\get_endpoint_url() ); ?></code>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button( __( 'Save Settings', 'wordforge' ) ); ?>
            </form>
        </div>
        <?php
    }

    private function render_abilities_card( array $abilities, bool $woo_active ): void {
        ?>
        <div class="wordforge-card wordforge-card-wide">
            <h2><?php esc_html_e( 'Available Abilities', 'wordforge' ); ?></h2>
            
            <div class="wordforge-abilities-grid">
                <?php foreach ( $abilities as $group => $group_abilities ) : ?>
                    <div class="wordforge-ability-group">
                        <h3>
                            <?php echo esc_html( $group ); ?>
                            <?php if ( 'WooCommerce' === $group && ! $woo_active ) : ?>
                                <span class="wordforge-badge wordforge-badge-neutral">
                                    <?php esc_html_e( 'Inactive', 'wordforge' ); ?>
                                </span>
                            <?php endif; ?>
                        </h3>
                        <ul>
                            <?php foreach ( $group_abilities as $ability ) : ?>
                                <li>
                                    <code><?php echo esc_html( $ability['name'] ); ?></code>
                                    <span class="wordforge-ability-desc">
                                        <?php echo esc_html( $ability['description'] ); ?>
                                    </span>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
    }

    private function render_connection_card( array $settings ): void {
        $endpoint_url = \WordForge\get_endpoint_url();
        ?>
        <div class="wordforge-card wordforge-card-wide">
            <h2><?php esc_html_e( 'MCP Connection', 'wordforge' ); ?></h2>
            
            <p class="description">
                <?php esc_html_e( 'Use these details to connect your MCP client.', 'wordforge' ); ?>
            </p>

            <table class="wordforge-status-table">
                <tr>
                    <td><?php esc_html_e( 'HTTP Endpoint', 'wordforge' ); ?></td>
                    <td><code><?php echo esc_html( $endpoint_url ); ?></code></td>
                </tr>
                <tr>
                    <td><?php esc_html_e( 'STDIO Command', 'wordforge' ); ?></td>
                    <td><code>wp mcp-adapter serve --server=wordforge</code></td>
                </tr>
            </table>

            <h3><?php esc_html_e( 'Claude Desktop Config', 'wordforge' ); ?></h3>
            <pre class="wordforge-code-block">{
  "mcpServers": {
    "wordforge": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "<?php echo esc_js( $endpoint_url ); ?>",
        "--header",
        "Authorization: Basic YOUR_BASE64_CREDENTIALS"
      ]
    }
  }
}</pre>
            <p class="description">
                <?php esc_html_e( 'Generate credentials:', 'wordforge' ); ?>
                <code>echo -n "username:app_password" | base64</code>
            </p>
        </div>
        <?php
    }

    private function get_registered_abilities(): array {
        return [
            'Content' => [
                [ 'name' => 'wordforge/list-content', 'description' => 'List posts, pages, CPTs' ],
                [ 'name' => 'wordforge/get-content', 'description' => 'Get single content item' ],
                [ 'name' => 'wordforge/create-content', 'description' => 'Create new content' ],
                [ 'name' => 'wordforge/update-content', 'description' => 'Update existing content' ],
                [ 'name' => 'wordforge/delete-content', 'description' => 'Delete content' ],
            ],
            'Blocks' => [
                [ 'name' => 'wordforge/get-page-blocks', 'description' => 'Get page block structure' ],
                [ 'name' => 'wordforge/update-page-blocks', 'description' => 'Update page blocks' ],
                [ 'name' => 'wordforge/create-revision', 'description' => 'Create revision before changes' ],
            ],
            'Styles' => [
                [ 'name' => 'wordforge/get-global-styles', 'description' => 'Get theme.json styles' ],
                [ 'name' => 'wordforge/update-global-styles', 'description' => 'Update global styles' ],
                [ 'name' => 'wordforge/get-block-styles', 'description' => 'Get block style variations' ],
                [ 'name' => 'wordforge/update-block-styles', 'description' => 'Register block styles' ],
            ],
            'WooCommerce' => [
                [ 'name' => 'wordforge/list-products', 'description' => 'List products' ],
                [ 'name' => 'wordforge/get-product', 'description' => 'Get product details' ],
                [ 'name' => 'wordforge/create-product', 'description' => 'Create product' ],
                [ 'name' => 'wordforge/update-product', 'description' => 'Update product' ],
                [ 'name' => 'wordforge/delete-product', 'description' => 'Delete product' ],
            ],
        ];
    }

    private function get_inline_styles(): string {
        return '
            .wordforge-settings { max-width: 1200px; }
            .wordforge-logo { font-size: 1.5em; margin-right: 8px; }
            .wordforge-tagline { font-size: 1.1em; color: #646970; margin-bottom: 24px; }
            
            .wordforge-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
            .wordforge-card { background: #fff; border: 1px solid #c3c4c7; border-radius: 4px; padding: 20px; }
            .wordforge-card h2 { margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid #f0f0f1; }
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
            .wordforge-badge-neutral { background: #e9ecef; color: #495057; }
            
            .wordforge-abilities-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
            .wordforge-ability-group h3 { margin: 0 0 12px; font-size: 14px; color: #1d2327; display: flex; align-items: center; gap: 8px; }
            .wordforge-ability-group ul { margin: 0; padding: 0; list-style: none; }
            .wordforge-ability-group li { padding: 6px 0; border-bottom: 1px solid #f0f0f1; }
            .wordforge-ability-group li:last-child { border-bottom: none; }
            .wordforge-ability-group code { font-size: 11px; background: #f6f7f7; padding: 2px 6px; border-radius: 3px; }
            .wordforge-ability-desc { display: block; font-size: 12px; color: #646970; margin-top: 2px; }
            
            .wordforge-code-block { background: #1d2327; color: #50c878; padding: 12px; border-radius: 4px; font-size: 11px; overflow-x: auto; white-space: pre; }
        ';
    }
}
