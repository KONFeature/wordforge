<?php

declare(strict_types=1);

namespace WordForge\Admin;

class SettingsPage {

	public function __construct() {
		add_action( 'admin_init', [ $this, 'register_settings' ] );
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

	public function render(): void {
		$mcp_active = class_exists( 'WP\\MCP\\Core\\McpAdapter' );
		$woo_active = \WordForge\is_woocommerce_active();
		$settings   = \WordForge\get_settings();
		$abilities  = $this->get_registered_abilities();

		$binary_info   = \WordForge\OpenCode\BinaryManager::get_platform_info();
		$server_status = \WordForge\OpenCode\ServerProcess::get_status();
		?>
		<div class="wrap wordforge-wrap">
			<h1>
				<span class="wordforge-logo">⚒️</span>
				<?php esc_html_e( 'WordForge Settings', 'wordforge' ); ?>
			</h1>

			<p class="wordforge-tagline">
				<?php esc_html_e( 'Forge your WordPress site through conversation.', 'wordforge' ); ?>
			</p>

			<div class="wordforge-cards">
				<?php $this->render_status_card( $mcp_active, $woo_active, $binary_info, $server_status ); ?>
				<?php $this->render_endpoint_settings_card( $settings ); ?>
				<?php $this->render_abilities_card( $abilities, $woo_active ); ?>
				<?php $this->render_connection_card( $settings ); ?>
			</div>
		</div>

		<?php $this->render_opencode_script(); ?>
		<?php
	}

	private function render_status_card( bool $mcp_active, bool $woo_active, array $binary_info, array $server_status ): void {
		?>
		<div class="wordforge-card">
			<h2><?php esc_html_e( 'Status', 'wordforge' ); ?></h2>

			<table class="wordforge-status-table">
				<tr>
					<td><?php esc_html_e( 'MCP Adapter', 'wordforge' ); ?></td>
					<td>
						<?php if ( $mcp_active ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php esc_html_e( 'Active', 'wordforge' ); ?></span>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-error"><?php esc_html_e( 'Not Found', 'wordforge' ); ?></span>
							<br><small><a href="https://github.com/WordPress/mcp-adapter" target="_blank"><?php esc_html_e( 'Install MCP Adapter', 'wordforge' ); ?></a></small>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'WooCommerce', 'wordforge' ); ?></td>
					<td>
						<?php if ( $woo_active ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php esc_html_e( 'Active', 'wordforge' ); ?></span>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-neutral"><?php esc_html_e( 'Not Installed', 'wordforge' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'Plugin Version', 'wordforge' ); ?></td>
					<td><code><?php echo esc_html( WORDFORGE_VERSION ); ?></code></td>
				</tr>
			</table>

			<h3><?php esc_html_e( 'OpenCode AI', 'wordforge' ); ?></h3>

			<table class="wordforge-status-table">
				<tr>
					<td><?php esc_html_e( 'Binary', 'wordforge' ); ?></td>
					<td>
						<?php if ( $binary_info['is_installed'] ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php esc_html_e( 'Installed', 'wordforge' ); ?></span>
							<code style="margin-left: 8px;"><?php echo esc_html( $binary_info['version'] ?? 'unknown' ); ?></code>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-neutral"><?php esc_html_e( 'Not Installed', 'wordforge' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'Server', 'wordforge' ); ?></td>
					<td>
						<?php if ( $server_status['running'] ) : ?>
							<span class="wordforge-badge wordforge-badge-success"><?php esc_html_e( 'Running', 'wordforge' ); ?></span>
							<code style="margin-left: 8px;">port <?php echo esc_html( $server_status['port'] ); ?></code>
						<?php else : ?>
							<span class="wordforge-badge wordforge-badge-neutral"><?php esc_html_e( 'Stopped', 'wordforge' ); ?></span>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<td><?php esc_html_e( 'Platform', 'wordforge' ); ?></td>
					<td><code><?php echo esc_html( $binary_info['os'] . '-' . $binary_info['arch'] ); ?></code></td>
				</tr>
			</table>

			<div class="wordforge-actions">
				<?php if ( ! $binary_info['is_installed'] ) : ?>
					<button type="button" class="button button-primary" id="wf-download-binary">
						<span class="dashicons dashicons-download"></span>
						<?php esc_html_e( 'Download OpenCode', 'wordforge' ); ?>
					</button>
				<?php elseif ( $server_status['running'] ) : ?>
					<button type="button" class="button" id="wf-stop-server">
						<span class="dashicons dashicons-controls-pause"></span>
						<?php esc_html_e( 'Stop Server', 'wordforge' ); ?>
					</button>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . MenuManager::OPENCODE_SLUG ) ); ?>" class="button button-primary">
						<span class="dashicons dashicons-format-chat"></span>
						<?php esc_html_e( 'Open Chat', 'wordforge' ); ?>
					</a>
				<?php else : ?>
					<button type="button" class="button button-primary" id="wf-start-server">
						<span class="dashicons dashicons-controls-play"></span>
						<?php esc_html_e( 'Start Server', 'wordforge' ); ?>
					</button>
				<?php endif; ?>
				<span id="wf-action-status" style="line-height: 30px; margin-left: 8px;"></span>
			</div>
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
								<input type="checkbox" id="wordforge_mcp_enabled" name="wordforge_settings[mcp_enabled]" value="1" <?php checked( $mcp_enabled ); ?>>
								<?php esc_html_e( 'Enable the WordForge MCP server', 'wordforge' ); ?>
							</label>
							<p class="description"><?php esc_html_e( 'When disabled, no MCP endpoint will be available.', 'wordforge' ); ?></p>
						</td>
					</tr>
					<tr>
						<th><label for="wordforge_mcp_namespace"><?php esc_html_e( 'Namespace', 'wordforge' ); ?></label></th>
						<td>
							<input type="text" id="wordforge_mcp_namespace" name="wordforge_settings[mcp_namespace]" value="<?php echo esc_attr( $settings['mcp_namespace'] ?? 'wordforge' ); ?>" class="regular-text">
							<p class="description"><?php esc_html_e( 'REST API namespace (e.g., wordforge)', 'wordforge' ); ?></p>
						</td>
					</tr>
					<tr>
						<th><label for="wordforge_mcp_route"><?php esc_html_e( 'Route', 'wordforge' ); ?></label></th>
						<td>
							<input type="text" id="wordforge_mcp_route" name="wordforge_settings[mcp_route]" value="<?php echo esc_attr( $settings['mcp_route'] ?? 'mcp' ); ?>" class="regular-text">
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
								<span class="wordforge-badge wordforge-badge-neutral"><?php esc_html_e( 'Inactive', 'wordforge' ); ?></span>
							<?php endif; ?>
						</h3>
						<ul>
							<?php foreach ( $group_abilities as $ability ) : ?>
								<li>
									<code><?php echo esc_html( $ability['name'] ); ?></code>
									<span class="wordforge-ability-desc"><?php echo esc_html( $ability['description'] ); ?></span>
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
				<p class="description"><?php esc_html_e( 'Use these details to connect your MCP client.', 'wordforge' ); ?></p>

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
					<li><a href="https://modelcontextprotocol.io/quickstart/user" target="_blank" rel="noopener"><?php esc_html_e( 'MCP Quickstart Guide', 'wordforge' ); ?> ↗</a></li>
					<li><a href="https://docs.anthropic.com/en/docs/claude-code/mcp" target="_blank" rel="noopener"><?php esc_html_e( 'Claude Code MCP Documentation', 'wordforge' ); ?> ↗</a></li>
					<li><a href="https://opencode.ai/docs/tools/mcp-servers" target="_blank" rel="noopener"><?php esc_html_e( 'OpenCode MCP Servers', 'wordforge' ); ?> ↗</a></li>
				</ul>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_opencode_script(): void {
		?>
		<script>
		(function() {
			const restUrl = <?php echo wp_json_encode( rest_url( 'wordforge/v1' ) ); ?>;
			const nonce = <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>;
			const status = document.getElementById('wf-action-status');

			const apiCall = async (endpoint, method = 'POST') => {
				const response = await fetch(restUrl + endpoint, {
					method,
					headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' }
				});
				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.error || data.message || 'Request failed');
				}
				return response.json();
			};

			const showStatus = (msg, type = 'info') => {
				const color = type === 'error' ? '#dc3232' : type === 'success' ? '#00a32a' : '#666';
				status.innerHTML = `<span style="color:${color}">${msg}</span>`;
			};

			document.getElementById('wf-download-binary')?.addEventListener('click', async function() {
				this.disabled = true;
				showStatus('Downloading... (may take a minute)');
				try {
					await apiCall('/opencode/download');
					showStatus('Downloaded! Reloading...', 'success');
					setTimeout(() => location.reload(), 1000);
				} catch (e) {
					showStatus('Error: ' + e.message, 'error');
					this.disabled = false;
				}
			});

			document.getElementById('wf-start-server')?.addEventListener('click', async function() {
				this.disabled = true;
				showStatus('Starting...');
				try {
					await apiCall('/opencode/start');
					showStatus('Started! Reloading...', 'success');
					setTimeout(() => location.reload(), 1000);
				} catch (e) {
					showStatus('Error: ' + e.message, 'error');
					this.disabled = false;
				}
			});

			document.getElementById('wf-stop-server')?.addEventListener('click', async function() {
				this.disabled = true;
				showStatus('Stopping...');
				try {
					await apiCall('/opencode/stop');
					showStatus('Stopped! Reloading...', 'success');
					setTimeout(() => location.reload(), 1000);
				} catch (e) {
					showStatus('Error: ' + e.message, 'error');
					this.disabled = false;
				}
			});
		})();
		</script>
		<?php
	}

	private function get_registered_abilities(): array {
		return [
			'Content'     => [
				[ 'name' => 'wordforge/list-content', 'description' => 'List posts, pages, CPTs' ],
				[ 'name' => 'wordforge/get-content', 'description' => 'Get single content item' ],
				[ 'name' => 'wordforge/save-content', 'description' => 'Create or update content' ],
				[ 'name' => 'wordforge/delete-content', 'description' => 'Delete content' ],
			],
			'Media'       => [
				[ 'name' => 'wordforge/list-media', 'description' => 'List media library items' ],
				[ 'name' => 'wordforge/get-media', 'description' => 'Get media details' ],
				[ 'name' => 'wordforge/upload-media', 'description' => 'Upload from URL or base64' ],
				[ 'name' => 'wordforge/update-media', 'description' => 'Update alt text, caption' ],
				[ 'name' => 'wordforge/delete-media', 'description' => 'Delete media item' ],
			],
			'Taxonomy'    => [
				[ 'name' => 'wordforge/list-terms', 'description' => 'List categories, tags, etc.' ],
				[ 'name' => 'wordforge/save-term', 'description' => 'Create or update term' ],
				[ 'name' => 'wordforge/delete-term', 'description' => 'Delete term' ],
			],
			'Blocks'      => [
				[ 'name' => 'wordforge/get-page-blocks', 'description' => 'Get page block structure' ],
				[ 'name' => 'wordforge/update-page-blocks', 'description' => 'Update page blocks' ],
			],
			'Templates'   => [
				[ 'name' => 'wordforge/list-templates', 'description' => 'List block templates (FSE)' ],
				[ 'name' => 'wordforge/get-template', 'description' => 'Get template with blocks' ],
				[ 'name' => 'wordforge/update-template', 'description' => 'Update template content' ],
			],
			'Styles'      => [
				[ 'name' => 'wordforge/get-global-styles', 'description' => 'Get theme.json styles' ],
				[ 'name' => 'wordforge/update-global-styles', 'description' => 'Update global styles' ],
				[ 'name' => 'wordforge/get-block-styles', 'description' => 'Get block style variations' ],
			],
			'Prompts'     => [
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
}
