<?php

declare(strict_types=1);

namespace WordForge\Admin;

class SettingsPage {

    public function __construct() {
        add_action( 'admin_menu', [ $this, 'add_menu_page' ] );
        add_action( 'admin_init', [ $this, 'register_settings' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_styles' ] );
        add_action( 'wp_ajax_wordforge_test_mcp', [ $this, 'ajax_test_mcp' ] );
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
                'mcp_enabled'   => true,
                'mcp_namespace' => 'wordforge',
                'mcp_route'     => 'mcp',
            ],
        ] );
    }

    public function sanitize_settings( array $input ): array {
        return [
            'mcp_enabled'   => ! empty( $input['mcp_enabled'] ),
            'mcp_namespace' => sanitize_text_field( $input['mcp_namespace'] ?? 'wordforge' ),
            'mcp_route'     => sanitize_text_field( $input['mcp_route'] ?? 'mcp' ),
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
                <?php $this->render_debug_card( $settings, $mcp_active ); ?>
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
        $mcp_enabled = $settings['mcp_enabled'] ?? true;
        ?>
        <div class="wordforge-card">
            <h2><?php esc_html_e( 'MCP Server Settings', 'wordforge' ); ?></h2>
            
            <form method="post" action="options.php">
                <?php settings_fields( 'wordforge_settings' ); ?>
                
                <table class="form-table wordforge-form-table">
                    <tr>
                        <th><label for="wordforge_mcp_enabled"><?php esc_html_e( 'Enable MCP', 'wordforge' ); ?></label></th>
                        <td>
                            <label>
                                <input type="checkbox" id="wordforge_mcp_enabled" name="wordforge_settings[mcp_enabled]" 
                                       value="1" <?php checked( $mcp_enabled ); ?>>
                                <?php esc_html_e( 'Enable the WordForge MCP server', 'wordforge' ); ?>
                            </label>
                            <p class="description"><?php esc_html_e( 'When disabled, no MCP endpoint will be available.', 'wordforge' ); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="wordforge_mcp_namespace"><?php esc_html_e( 'Namespace', 'wordforge' ); ?></label></th>
                        <td>
                            <input type="text" id="wordforge_mcp_namespace" name="wordforge_settings[mcp_namespace]" 
                                   value="<?php echo esc_attr( $settings['mcp_namespace'] ?? 'wordforge' ); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e( 'REST API namespace (e.g., wordforge)', 'wordforge' ); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="wordforge_mcp_route"><?php esc_html_e( 'Route', 'wordforge' ); ?></label></th>
                        <td>
                            <input type="text" id="wordforge_mcp_route" name="wordforge_settings[mcp_route]" 
                                   value="<?php echo esc_attr( $settings['mcp_route'] ?? 'mcp' ); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e( 'MCP endpoint route (e.g., mcp)', 'wordforge' ); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e( 'Endpoint URL', 'wordforge' ); ?></th>
                        <td>
                            <?php if ( $mcp_enabled ) : ?>
                                <code><?php echo esc_html( \WordForge\get_endpoint_url() ); ?></code>
                            <?php else : ?>
                                <span class="wordforge-badge wordforge-badge-neutral"><?php esc_html_e( 'Disabled', 'wordforge' ); ?></span>
                            <?php endif; ?>
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
        $mcp_enabled  = $settings['mcp_enabled'] ?? true;
        $endpoint_url = \WordForge\get_endpoint_url();
        $server_id    = \WordForge\Mcp\ServerManager::get_server_id();
        ?>
        <div class="wordforge-card wordforge-card-wide">
            <h2><?php esc_html_e( 'MCP Connection', 'wordforge' ); ?></h2>
            
            <?php if ( ! $mcp_enabled ) : ?>
                <p class="wordforge-notice-warning">
                    <?php esc_html_e( 'MCP server is currently disabled. Enable it in the settings above to connect.', 'wordforge' ); ?>
                </p>
            <?php else : ?>
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
                        <td><code>wp mcp-adapter serve --server=<?php echo esc_html( $server_id ); ?></code></td>
                    </tr>
                </table>

                <h3><?php esc_html_e( 'Claude Desktop Config', 'wordforge' ); ?></h3>
                <pre class="wordforge-code-block">{
  "mcpServers": {
    "wordforge": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-remote@latest",
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

                <h3><?php esc_html_e( 'Setup Guides', 'wordforge' ); ?></h3>
                <ul class="wordforge-doc-links">
                    <li>
                        <a href="https://modelcontextprotocol.io/quickstart/user" target="_blank" rel="noopener">
                            <?php esc_html_e( 'MCP Quickstart Guide', 'wordforge' ); ?> ↗
                        </a>
                    </li>
                    <li>
                        <a href="https://docs.anthropic.com/en/docs/claude-code/mcp" target="_blank" rel="noopener">
                            <?php esc_html_e( 'Claude Code MCP Documentation', 'wordforge' ); ?> ↗
                        </a>
                    </li>
                    <li>
                        <a href="https://opencode.ai/docs/tools/mcp-servers" target="_blank" rel="noopener">
                            <?php esc_html_e( 'OpenCode MCP Servers', 'wordforge' ); ?> ↗
                        </a>
                    </li>
                </ul>
            <?php endif; ?>
        </div>
        <?php
    }

    private function render_debug_card( array $settings, bool $mcp_active ): void {
        $mcp_enabled  = $settings['mcp_enabled'] ?? true;
        $endpoint_url = \WordForge\get_endpoint_url();
        ?>
        <div class="wordforge-card wordforge-card-wide">
            <h2><?php esc_html_e( 'Debug & Testing', 'wordforge' ); ?></h2>
            
            <?php if ( ! $mcp_active || ! $mcp_enabled ) : ?>
                <p class="wordforge-notice-warning">
                    <?php esc_html_e( 'MCP server must be active and enabled to test.', 'wordforge' ); ?>
                </p>
            <?php else : ?>
                <table class="form-table wordforge-form-table">
                    <tr>
                        <th><label for="wordforge_test_credentials"><?php esc_html_e( 'Credentials', 'wordforge' ); ?></label></th>
                        <td>
                            <input type="text" id="wordforge_test_credentials" class="regular-text" 
                                   placeholder="username:application_password">
                            <p class="description"><?php esc_html_e( 'Enter username:app_password (will be base64 encoded automatically)', 'wordforge' ); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e( 'Test Endpoint', 'wordforge' ); ?></th>
                        <td>
                            <button type="button" id="wordforge_test_discover" class="button button-secondary">
                                <?php esc_html_e( 'Test Discover Abilities', 'wordforge' ); ?>
                            </button>
                            <button type="button" id="wordforge_test_tools" class="button button-secondary">
                                <?php esc_html_e( 'List MCP Tools', 'wordforge' ); ?>
                            </button>
                            <span id="wordforge_test_status" style="margin-left: 10px;"></span>
                        </td>
                    </tr>
                </table>

                <div id="wordforge_test_result" style="display: none; margin-top: 16px;">
                    <h3><?php esc_html_e( 'Response', 'wordforge' ); ?></h3>
                    <pre class="wordforge-code-block" id="wordforge_test_output" style="max-height: 400px; overflow: auto;"></pre>
                </div>

                <script>
                (function() {
                    const endpoint = <?php echo wp_json_encode( $endpoint_url ); ?>;
                    const credInput = document.getElementById('wordforge_test_credentials');
                    const discoverBtn = document.getElementById('wordforge_test_discover');
                    const toolsBtn = document.getElementById('wordforge_test_tools');
                    const status = document.getElementById('wordforge_test_status');
                    const resultDiv = document.getElementById('wordforge_test_result');
                    const output = document.getElementById('wordforge_test_output');

                    async function testMcp(method, params = {}) {
                        const creds = credInput.value.trim();
                        if (!creds) {
                            status.innerHTML = '<span style="color: #dc3232;">Enter credentials first</span>';
                            return;
                        }

                        const authHeader = 'Basic ' + btoa(creds);
                        status.innerHTML = '<span style="color: #666;">Testing...</span>';

                        try {
                            // First, initialize the session
                            const initResponse = await fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': authHeader
                                },
                                body: JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: 1,
                                    method: 'initialize',
                                    params: {
                                        protocolVersion: '2024-11-05',
                                        capabilities: {},
                                        clientInfo: { name: 'WordForge Debug', version: '1.0.0' }
                                    }
                                })
                            });

                            const sessionId = initResponse.headers.get('mcp-session-id');
                            if (!sessionId) {
                                throw new Error('No session ID returned. Check credentials and endpoint.');
                            }

                            // Now make the actual request
                            const response = await fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': authHeader,
                                    'mcp-session-id': sessionId
                                },
                                body: JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: 2,
                                    method: method,
                                    params: params
                                })
                            });

                            const data = await response.json();
                            status.innerHTML = '<span style="color: #46b450;">Success!</span>';
                            resultDiv.style.display = 'block';
                            output.textContent = JSON.stringify(data, null, 2);
                        } catch (error) {
                            status.innerHTML = '<span style="color: #dc3232;">Error: ' + error.message + '</span>';
                            resultDiv.style.display = 'block';
                            output.textContent = error.toString();
                        }
                    }

                    discoverBtn.addEventListener('click', () => {
                        testMcp('tools/call', {
                            name: 'mcp-adapter-discover-abilities',
                            arguments: {}
                        });
                    });

                    toolsBtn.addEventListener('click', () => {
                        testMcp('tools/list', {});
                    });
                })();
                </script>
            <?php endif; ?>
        </div>
        <?php
    }

    public function ajax_test_mcp(): void {
        check_ajax_referer( 'wordforge_test_mcp', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Unauthorized' );
        }

        wp_send_json_success( [ 'message' => 'Use the browser-based test instead' ] );
    }

    private function get_registered_abilities(): array {
        return [
            'Content' => [
                [ 'name' => 'wordforge/list-content', 'description' => 'List posts, pages, CPTs' ],
                [ 'name' => 'wordforge/get-content', 'description' => 'Get single content item' ],
                [ 'name' => 'wordforge/save-content', 'description' => 'Create or update content' ],
                [ 'name' => 'wordforge/delete-content', 'description' => 'Delete content' ],
            ],
            'Media' => [
                [ 'name' => 'wordforge/list-media', 'description' => 'List media library items' ],
                [ 'name' => 'wordforge/get-media', 'description' => 'Get media details' ],
                [ 'name' => 'wordforge/upload-media', 'description' => 'Upload from URL or base64' ],
                [ 'name' => 'wordforge/update-media', 'description' => 'Update alt text, caption' ],
                [ 'name' => 'wordforge/delete-media', 'description' => 'Delete media item' ],
            ],
            'Taxonomy' => [
                [ 'name' => 'wordforge/list-terms', 'description' => 'List categories, tags, etc.' ],
                [ 'name' => 'wordforge/save-term', 'description' => 'Create or update term' ],
                [ 'name' => 'wordforge/delete-term', 'description' => 'Delete term' ],
            ],
            'Blocks' => [
                [ 'name' => 'wordforge/get-page-blocks', 'description' => 'Get page block structure' ],
                [ 'name' => 'wordforge/update-page-blocks', 'description' => 'Update page blocks' ],
            ],
            'Templates' => [
                [ 'name' => 'wordforge/list-templates', 'description' => 'List block templates (FSE)' ],
                [ 'name' => 'wordforge/get-template', 'description' => 'Get template with blocks' ],
                [ 'name' => 'wordforge/update-template', 'description' => 'Update template content' ],
            ],
            'Styles' => [
                [ 'name' => 'wordforge/get-global-styles', 'description' => 'Get theme.json styles' ],
                [ 'name' => 'wordforge/update-global-styles', 'description' => 'Update global styles' ],
                [ 'name' => 'wordforge/get-block-styles', 'description' => 'Get block style variations' ],
            ],
            'Prompts' => [
                [ 'name' => 'wordforge/generate-content', 'description' => 'Generate blog posts, pages' ],
                [ 'name' => 'wordforge/review-content', 'description' => 'Review and improve content' ],
                [ 'name' => 'wordforge/seo-optimization', 'description' => 'Analyze content for SEO' ],
            ],
            'WooCommerce' => [
                [ 'name' => 'wordforge/list-products', 'description' => 'List products' ],
                [ 'name' => 'wordforge/get-product', 'description' => 'Get product details' ],
                [ 'name' => 'wordforge/save-product', 'description' => 'Create or update product' ],
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
            .wordforge-notice-warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 0 0 16px; }
            
            .wordforge-doc-links { margin: 8px 0 0; padding-left: 0; list-style: none; }
            .wordforge-doc-links li { margin: 4px 0; }
            .wordforge-doc-links a { text-decoration: none; color: #2271b1; }
            .wordforge-doc-links a:hover { color: #135e96; text-decoration: underline; }
        ';
    }
}
