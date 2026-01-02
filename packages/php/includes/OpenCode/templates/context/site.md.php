<?php
/**
 * WordPress site context template.
 *
 * @package WordForge
 * @var array<string, mixed> $context WordPress context from ContextProvider.
 * @var bool $is_local Whether this is for local OpenCode mode (no wp-cli, no bash).
 */

defined( 'ABSPATH' ) || exit;

$is_local = $is_local ?? false;
?>
# WordPress Site Context

## Site Information

| Property | Value |
|----------|-------|
| **Site Name** | <?php echo esc_html( $context['site']['name'] ); ?> |
| **Site URL** | <?php echo esc_url( $context['site']['url'] ); ?> |
| **Home URL** | <?php echo esc_url( $context['site']['home_url'] ); ?> |
| **Admin URL** | <?php echo esc_url( $context['site']['admin_url'] ); ?> |
| **WordPress Version** | <?php echo esc_html( $context['site']['wp_version'] ); ?> |
| **Language** | <?php echo esc_html( $context['site']['language'] ); ?> |
| **Charset** | <?php echo esc_html( $context['site']['charset'] ); ?> |
<?php if ( ! $is_local ) : ?>
| **Root Directory** | `<?php echo esc_html( $context['site']['root_directory'] ); ?>` |
<?php endif; ?>

**Content Language**: When creating content, use **<?php echo esc_html( $context['site']['language'] ); ?>** as the primary language unless instructed otherwise.

---

## Active Theme

| Property | Value |
|----------|-------|
| **Name** | <?php echo esc_html( $context['theme']['name'] ); ?> |
| **Version** | <?php echo esc_html( $context['theme']['version'] ); ?> |
| **Type** | <?php echo $context['theme']['is_block_theme'] ? 'Block Theme (FSE)' : 'Classic Theme'; ?> |
<?php if ( $context['theme']['is_child_theme'] ) : ?>
| **Parent Theme** | <?php echo esc_html( $context['theme']['parent_name'] ); ?> |
<?php endif; ?>
<?php if ( ! $is_local ) : ?>
| **Path** | `<?php echo esc_html( $context['theme']['path'] ); ?>` |
<?php if ( $context['theme']['is_child_theme'] ) : ?>
| **Parent Path** | `<?php echo esc_html( $context['theme']['template_path'] ); ?>` |
<?php endif; ?>
<?php endif; ?>

### Theme Capabilities

<?php
$supports = array();
if ( $context['theme']['supports']['widgets'] ) {
	$supports[] = 'Widgets';
}
if ( $context['theme']['supports']['menus'] ) {
	$supports[] = 'Menus';
}
if ( $context['theme']['supports']['custom_logo'] ) {
	$supports[] = 'Custom Logo';
}
if ( $context['theme']['supports']['post_thumbnails'] ) {
	$supports[] = 'Featured Images';
}
if ( $context['theme']['supports']['block_templates'] ) {
	$supports[] = 'Block Templates';
}
if ( $context['theme']['supports']['editor_styles'] ) {
	$supports[] = 'Editor Styles';
}
echo implode( ', ', $supports );
?>

---

## Active Plugins

**Total**: <?php echo count( $context['plugins']['active'] ); ?> of <?php echo $context['plugins']['total']; ?> installed plugins active

<?php foreach ( $context['plugins']['active'] as $plugin ) : ?>
- **<?php echo esc_html( $plugin['name'] ); ?>** (v<?php echo esc_html( $plugin['version'] ); ?>)
<?php endforeach; ?>

<?php if ( $context['plugins']['woocommerce_active'] ) : ?>

### WooCommerce Status

**WooCommerce is ACTIVE** on this site. The `wordpress-commerce-manager` subagent is available for product management tasks.

Available WooCommerce operations:
- Product CRUD (simple, variable, grouped, external)
- Order management
- Product categories and tags
- Inventory and stock control
<?php endif; ?>

---

## Content Types

### Post Types

| Post Type | Label | Supports |
|-----------|-------|----------|
<?php foreach ( $context['content_types']['post_types'] as $pt ) : ?>
| `<?php echo esc_html( $pt['name'] ); ?>` | <?php echo esc_html( $pt['label'] ); ?> | <?php echo esc_html( implode( ', ', array_slice( $pt['supports'], 0, 5 ) ) ); ?> |
<?php endforeach; ?>

### Taxonomies

| Taxonomy | Label | Type |
|----------|-------|------|
<?php foreach ( $context['content_types']['taxonomies'] as $tax ) : ?>
| `<?php echo esc_html( $tax['name'] ); ?>` | <?php echo esc_html( $tax['label'] ); ?> | <?php echo $tax['hierarchical'] ? 'Hierarchical (like categories)' : 'Flat (like tags)'; ?> |
<?php endforeach; ?>

<?php if ( ! $is_local ) : ?>
---

## Server Environment

### CLI Tools

| Tool | Status |
|------|--------|
| **WP-CLI** | <?php echo $context['cli_tools']['wp_cli'] ? 'Available ✓' : 'Not available'; ?> |
| **Composer** | <?php echo $context['cli_tools']['composer'] ? 'Available ✓' : 'Not available'; ?> |

<?php if ( $context['cli_tools']['wp_cli'] ) : ?>
**WP-CLI is available**. You can use `wp` commands for:
- `wp post list` - Quick content inventory
- `wp option get <option>` - Read WordPress options
- `wp plugin list` - Plugin status
- `wp db query "SELECT..."` - Database queries (SELECT only)
<?php endif; ?>

### File System Paths

| Path | Location |
|------|----------|
| **WordPress Root** | `<?php echo esc_html( $context['site']['root_directory'] ); ?>` |
| **Theme Directory** | `<?php echo esc_html( $context['theme']['path'] ); ?>` |
| **Plugins Directory** | `<?php echo esc_html( $context['site']['root_directory'] ); ?>/wp-content/plugins/` |
| **Uploads Directory** | `<?php echo esc_html( $context['site']['root_directory'] ); ?>/wp-content/uploads/` |

You can read files in these directories using `cat`, `grep`, `find`, `ls`.
<?php else : ?>
---

## Local Mode Notice

This configuration is running in **LOCAL MODE** on the user's machine, connected to WordPress remotely via MCP.

**Limitations**:
- No shell access to the WordPress server
- No file system access (cannot read theme files, wp-config.php, etc.)
- No WP-CLI access
- All operations must use MCP tools

**Available**: All WordForge MCP tools for content, media, taxonomy, blocks, styles, and templates.
<?php endif; ?>
