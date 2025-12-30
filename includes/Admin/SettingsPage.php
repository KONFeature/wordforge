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
        wp_enqueue_script(
            'wordforge-opencode',
            WORDFORGE_PLUGIN_URL . 'assets/js/opencode-chat.js',
            [],
            WORDFORGE_VERSION,
            true
        );
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
                <?php $this->render_opencode_card(); ?>
                <?php $this->render_status_card( $mcp_active, $woo_active ); ?>
                <?php $this->render_endpoint_settings_card( $settings ); ?>
                <?php $this->render_abilities_card( $abilities, $woo_active ); ?>
                <?php $this->render_connection_card( $settings ); ?>
                <?php $this->render_debug_card( $settings, $mcp_active ); ?>
            </div>
        </div>
        <?php
    }

    private function render_opencode_card(): void {
        ?>
        <div class="wordforge-card wordforge-card-wide wordforge-opencode-card">
            <h2>
                <span class="dashicons dashicons-format-chat"></span>
                <?php esc_html_e( 'AI Assistant', 'wordforge' ); ?>
            </h2>

            <div id="wordforge-opencode-app" data-rest-url="<?php echo esc_attr( rest_url( 'wordforge/v1' ) ); ?>" data-nonce="<?php echo esc_attr( wp_create_nonce( 'wp_rest' ) ); ?>">
                <div class="wordforge-opencode-loading">
                    <span class="spinner is-active"></span>
                    <?php esc_html_e( 'Loading AI Assistant...', 'wordforge' ); ?>
                    <p style="font-size: 11px; color: #666; margin-top: 10px;">
                        If this stays stuck, check:<br>
                        1. Browser console (F12) for errors<br>
                        2. Debug section below<br>
                        3. REST API endpoint: <code style="font-size: 10px;"><?php echo esc_html( rest_url( 'wordforge/v1/opencode/status' ) ); ?></code>
                    </p>
                </div>
            </div>

            <?php $this->render_opencode_debug(); ?>
        </div>
        <?php
    }

    private function render_opencode_debug(): void {
        $binary_info   = \WordForge\OpenCode\BinaryManager::get_platform_info();
        $server_status = \WordForge\OpenCode\ServerProcess::get_status();
        $has_keys      = \WordForge\OpenCode\ProviderKeyStorage::has_any_key();
        $providers     = \WordForge\OpenCode\ProviderKeyStorage::get_supported_providers();
        $configured    = [];

        foreach ( $providers as $id => $info ) {
            $key = \WordForge\OpenCode\ProviderKeyStorage::get_key( $id );
            $configured[ $id ] = ! empty( $key );
        }

        ?>
        <details class="wordforge-opencode-debug" style="margin-top: 20px; padding: 16px; background: #f6f7f7; border-radius: 4px;">
            <summary style="cursor: pointer; font-weight: 600; margin-bottom: 12px;">
                <span class="dashicons dashicons-admin-tools" style="margin-right: 6px;"></span>
                Debug Information
            </summary>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px;">
                <div>
                    <h4 style="margin: 0 0 8px; font-size: 13px;">Binary Status</h4>
                    <table class="wordforge-status-table" style="font-size: 12px;">
                        <tr>
                            <td>Installed</td>
                            <td>
                                <?php if ( $binary_info['is_installed'] ) : ?>
                                    <span class="wordforge-badge wordforge-badge-success">Yes</span>
                                <?php else : ?>
                                    <span class="wordforge-badge wordforge-badge-error">No</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td>Version</td>
                            <td><code><?php echo esc_html( $binary_info['version'] ?? 'N/A' ); ?></code></td>
                        </tr>
                        <tr>
                            <td>Platform</td>
                            <td><code><?php echo esc_html( $binary_info['os'] . '-' . $binary_info['arch'] ); ?></code></td>
                        </tr>
                        <tr>
                            <td>Binary Name</td>
                            <td><code style="font-size: 10px;"><?php echo esc_html( $binary_info['binary_name'] ); ?></code></td>
                        </tr>
                        <tr>
                            <td>Binary Path</td>
                            <td><code style="font-size: 10px; word-break: break-all;"><?php echo esc_html( $binary_info['binary_path'] ); ?></code></td>
                        </tr>
                        <tr>
                            <td>Path Exists</td>
                            <td>
                                <?php if ( file_exists( $binary_info['binary_path'] ) ) : ?>
                                    <span class="wordforge-badge wordforge-badge-success">Yes</span>
                                <?php else : ?>
                                    <span class="wordforge-badge wordforge-badge-neutral">No</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td>Is Executable</td>
                            <td>
                                <?php if ( is_executable( $binary_info['binary_path'] ) ) : ?>
                                    <span class="wordforge-badge wordforge-badge-success">Yes</span>
                                <?php else : ?>
                                    <span class="wordforge-badge wordforge-badge-neutral">No</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    </table>
                </div>

                <div>
                    <h4 style="margin: 0 0 8px; font-size: 13px;">Server Status</h4>
                    <table class="wordforge-status-table" style="font-size: 12px;">
                        <tr>
                            <td>Running</td>
                            <td>
                                <?php if ( $server_status['running'] ) : ?>
                                    <span class="wordforge-badge wordforge-badge-success">Yes</span>
                                <?php else : ?>
                                    <span class="wordforge-badge wordforge-badge-neutral">No</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <td>PID</td>
                            <td><code><?php echo esc_html( $server_status['pid'] ?? 'N/A' ); ?></code></td>
                        </tr>
                        <tr>
                            <td>Port</td>
                            <td><code><?php echo esc_html( $server_status['port'] ?? 'N/A' ); ?></code></td>
                        </tr>
                        <tr>
                            <td>URL</td>
                            <td><code><?php echo esc_html( $server_status['url'] ?? 'N/A' ); ?></code></td>
                        </tr>
                    </table>

                    <h4 style="margin: 16px 0 8px; font-size: 13px;">Provider Keys</h4>
                    <table class="wordforge-status-table" style="font-size: 12px;">
                        <tr>
                            <td>Has Any Key</td>
                            <td>
                                <?php if ( $has_keys ) : ?>
                                    <span class="wordforge-badge wordforge-badge-success">Yes</span>
                                <?php else : ?>
                                    <span class="wordforge-badge wordforge-badge-neutral">No (using Zen)</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php foreach ( $configured as $provider => $is_set ) : ?>
                        <tr>
                            <td><?php echo esc_html( ucfirst( $provider ) ); ?></td>
                            <td>
                                <?php if ( $is_set ) : ?>
                                    <span class="wordforge-badge wordforge-badge-success">Configured</span>
                                <?php else : ?>
                                    <span class="wordforge-badge wordforge-badge-neutral">Not Set</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            </div>

            <div style="margin-top: 16px;">
                <h4 style="margin: 0 0 8px; font-size: 13px;">REST API</h4>
                <table class="wordforge-status-table" style="font-size: 12px;">
                    <tr>
                        <td>Endpoint</td>
                        <td><code style="font-size: 10px;"><?php echo esc_html( rest_url( 'wordforge/v1/opencode/status' ) ); ?></code></td>
                    </tr>
                    <tr>
                        <td>Nonce</td>
                        <td><code style="font-size: 10px;"><?php echo esc_html( wp_create_nonce( 'wp_rest' ) ); ?></code></td>
                    </tr>
                </table>
            </div>

            <div style="margin-top: 16px;">
                <h4 style="margin: 0 0 8px; font-size: 13px;">Quick Actions</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                    <button type="button" class="button button-small" id="wf-dbg-test-api">Test REST API</button>
                    <button type="button" class="button button-small" id="wf-dbg-check-update">Check GitHub</button>
                    <button type="button" class="button button-small button-primary" id="wf-dbg-download">Download Binary</button>
                    <button type="button" class="button button-small" id="wf-dbg-start" style="background:#28a745;border-color:#28a745;color:#fff;">Start Server</button>
                    <button type="button" class="button button-small" id="wf-dbg-stop" style="background:#dc3545;border-color:#dc3545;color:#fff;">Stop Server</button>
                    <button type="button" class="button button-small" id="wf-dbg-cleanup">Cleanup All</button>
                </div>
                <div id="wf-dbg-result" style="font-size: 12px; padding: 8px; background: #f6f7f7; border-radius: 4px; min-height: 20px;">
                    Click a button to test...
                </div>
            </div>

            <script>
            (function() {
                const restUrl = <?php echo wp_json_encode( rest_url( 'wordforge/v1' ) ); ?>;
                const nonce = <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>;
                const result = document.getElementById('wf-dbg-result');

                const log = (msg, type = 'info') => {
                    const color = type === 'error' ? 'red' : type === 'success' ? 'green' : '#333';
                    result.innerHTML = `<span style="color:${color}">${msg}</span>`;
                    console.log('[WordForge Debug]', msg);
                };

                const apiCall = async (endpoint, method = 'GET') => {
                    const response = await fetch(restUrl + endpoint, {
                        method,
                        headers: { 'X-WP-Nonce': nonce }
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
                    return data;
                };

                document.getElementById('wf-dbg-test-api')?.addEventListener('click', async () => {
                    log('Testing REST API...');
                    try {
                        const data = await apiCall('/opencode/status');
                        log('✓ API Working - Binary: ' + (data.binary?.is_installed ? 'Yes' : 'No') + ', Server: ' + (data.server?.running ? 'Running' : 'Stopped'), 'success');
                        console.log('Full status:', data);
                    } catch (e) {
                        log('✗ ' + e.message, 'error');
                    }
                });

                document.getElementById('wf-dbg-check-update')?.addEventListener('click', async () => {
                    log('Checking GitHub...');
                    try {
                        const response = await fetch('https://api.github.com/repos/sst/opencode/releases/latest');
                        const data = await response.json();
                        log('✓ Latest version: ' + data.tag_name, 'success');
                    } catch (e) {
                        log('✗ ' + e.message, 'error');
                    }
                });

                document.getElementById('wf-dbg-download')?.addEventListener('click', async () => {
                    log('Downloading binary... (this may take a minute)');
                    try {
                        const data = await apiCall('/opencode/download', 'POST');
                        log('✓ Downloaded! Version: ' + data.version, 'success');
                        setTimeout(() => location.reload(), 1500);
                    } catch (e) {
                        log('✗ Download failed: ' + e.message, 'error');
                    }
                });

                document.getElementById('wf-dbg-start')?.addEventListener('click', async () => {
                    log('Starting server...');
                    try {
                        const data = await apiCall('/opencode/start', 'POST');
                        log('✓ Server started on port ' + data.port + ' - URL: ' + data.url, 'success');
                        setTimeout(() => location.reload(), 1500);
                    } catch (e) {
                        log('✗ Start failed: ' + e.message, 'error');
                    }
                });

                document.getElementById('wf-dbg-stop')?.addEventListener('click', async () => {
                    log('Stopping server...');
                    try {
                        await apiCall('/opencode/stop', 'POST');
                        log('✓ Server stopped', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } catch (e) {
                        log('✗ Stop failed: ' + e.message, 'error');
                    }
                });

                document.getElementById('wf-dbg-cleanup')?.addEventListener('click', async () => {
                    if (!confirm('This will stop the server and delete the binary. Continue?')) return;
                    log('Cleaning up...');
                    try {
                        await apiCall('/opencode/cleanup', 'POST');
                        log('✓ Cleanup complete', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } catch (e) {
                        log('✗ Cleanup failed: ' + e.message, 'error');
                    }
                });
            })();
            </script>
        </details>
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

            /* OpenCode Chat Styles */
            .wordforge-opencode-card { order: -1; }
            .wordforge-opencode-card h2 { display: flex; align-items: center; gap: 8px; }
            .wordforge-opencode-card h2 .dashicons { color: #2271b1; }
            
            .wordforge-opencode-loading { text-align: center; padding: 40px; color: #646970; }
            .wordforge-opencode-loading .spinner { margin-right: 8px; }
            
            .wordforge-opencode-setup { padding: 20px 0; }
            .wordforge-opencode-steps { display: flex; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f1; }
            .wordforge-step { display: flex; align-items: center; gap: 8px; color: #646970; }
            .wordforge-step.active { color: #2271b1; font-weight: 500; }
            .wordforge-step.complete { color: #00a32a; }
            .wordforge-step .step-number { width: 24px; height: 24px; border-radius: 50%; background: #f0f0f1; display: flex; align-items: center; justify-content: center; font-size: 12px; }
            .wordforge-step.active .step-number { background: #2271b1; color: #fff; }
            .wordforge-step.complete .step-number { background: #00a32a; color: #fff; }
            .wordforge-step .dashicons-yes-alt { color: #00a32a; }
            
            .wordforge-setup-content { max-width: 600px; }
            .wordforge-download-section, .wordforge-provider-section { }
            .wordforge-download-section p, .wordforge-provider-section p { margin: 0 0 16px; }
            
            .wordforge-provider-options { display: flex; flex-direction: column; gap: 12px; }
            .wordforge-provider-option { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border: 1px solid #c3c4c7; border-radius: 4px; cursor: pointer; transition: border-color 0.2s; }
            .wordforge-provider-option:hover { border-color: #2271b1; }
            .wordforge-provider-option input { margin-top: 4px; }
            .wordforge-provider-option .option-content { flex: 1; }
            .wordforge-provider-option .option-content strong { display: block; margin-bottom: 4px; }
            .wordforge-provider-option .option-content .description { font-size: 13px; color: #646970; }
            
            .wordforge-provider-inputs { display: flex; flex-direction: column; gap: 16px; }
            .provider-input-group label { display: block; margin-bottom: 6px; font-weight: 500; }
            .provider-input-group input { width: 100%; }
            
            .button-hero { padding: 12px 24px !important; height: auto !important; font-size: 14px !important; }
            .button-hero .dashicons { margin-right: 6px; line-height: 1.4; }
            
            .wordforge-chat-container { display: flex; flex-direction: column; height: 500px; border: 1px solid #c3c4c7; border-radius: 4px; overflow: hidden; }
            .wordforge-chat-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f6f7f7; border-bottom: 1px solid #c3c4c7; }
            .wordforge-chat-status { display: flex; align-items: center; gap: 8px; font-size: 13px; }
            .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #646970; }
            .status-dot.online { background: #00a32a; }
            
            .wordforge-chat-messages { flex: 1; overflow-y: auto; padding: 16px; background: #fff; }
            .wordforge-welcome-message { background: #f0f6fc; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
            .wordforge-welcome-message p { margin: 0 0 8px; }
            .wordforge-welcome-message ul { margin: 8px 0 0; padding-left: 20px; }
            .wordforge-welcome-message li { margin: 4px 0; color: #646970; }
            .wordforge-welcome-message .suggestions { font-weight: 500; margin-top: 12px; }
            
            .wordforge-message { margin-bottom: 16px; display: flex; }
            .wordforge-message.user { justify-content: flex-end; }
            .wordforge-message .message-content { max-width: 80%; padding: 12px 16px; border-radius: 12px; }
            .wordforge-message.user .message-content { background: #2271b1; color: #fff; border-bottom-right-radius: 4px; }
            .wordforge-message.assistant .message-content { background: #f6f7f7; border-bottom-left-radius: 4px; }
            .wordforge-message.error .message-content { background: #f8d7da; color: #721c24; }
            .wordforge-message .message-content code { background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 3px; font-size: 12px; }
            .wordforge-message .message-content pre { background: #1d2327; color: #50c878; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 8px 0; }
            .wordforge-message .tool-call { background: #fff3cd; padding: 8px 12px; border-radius: 4px; margin: 8px 0; font-size: 12px; }
            .wordforge-message .tool-result { margin: 8px 0; }
            .wordforge-message .tool-result pre { font-size: 11px; max-height: 200px; overflow: auto; }
            
            .wordforge-message.thinking .message-content { background: #f6f7f7; }
            .thinking-dots span { animation: thinking 1.4s infinite; opacity: 0.3; }
            .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
            .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes thinking { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
            
            .wordforge-chat-input-container { display: flex; gap: 8px; padding: 12px 16px; background: #f6f7f7; border-top: 1px solid #c3c4c7; }
            .wordforge-chat-input-container textarea { flex: 1; resize: none; padding: 10px 12px; border: 1px solid #c3c4c7; border-radius: 4px; font-size: 14px; }
            .wordforge-chat-input-container textarea:focus { border-color: #2271b1; outline: none; box-shadow: 0 0 0 1px #2271b1; }
            .wordforge-chat-input-container button { padding: 10px 16px; }
            .wordforge-chat-input-container button .dashicons { line-height: 1.4; }
            
            .wordforge-opencode-error { text-align: center; padding: 40px; }
            .wordforge-opencode-error .dashicons { font-size: 48px; width: 48px; height: 48px; color: #dc3232; margin-bottom: 16px; }
            .wordforge-opencode-error p { margin: 0 0 16px; }

            /* Simplified OpenCode UI */
            .wordforge-opencode-setup h3 { margin: 0 0 12px; }
            .wordforge-opencode-setup p { margin: 0 0 16px; color: #50575e; }
            
            .wordforge-opencode-header { display: flex; align-items: center; gap: 12px; padding: 16px; background: #d4edda; border-radius: 4px; margin-bottom: 16px; }
            .wordforge-opencode-header .status-indicator { width: 10px; height: 10px; border-radius: 50%; background: #28a745; animation: pulse 2s infinite; }
            .wordforge-opencode-header .status-indicator.online { background: #28a745; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            
            .wordforge-opencode-frame-container { margin-top: 16px; }
            .wordforge-opencode-frame-notice { background: #f0f6fc; padding: 20px; border-radius: 4px; border: 1px solid #c3c4c7; }
            .wordforge-opencode-frame-notice code { background: #fff; padding: 8px 12px; display: inline-block; margin: 8px 0; border-radius: 4px; font-size: 14px; }
            .wordforge-opencode-frame-notice .description { color: #646970; font-size: 13px; }
            
            .wordforge-opencode-running { }
        ';
    }
}
