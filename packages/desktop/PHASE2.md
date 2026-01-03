# WordForge Desktop - Phase 2 Roadmap

## Overview

Phase 1 delivered the core desktop connection flow. Phase 2 focuses on enhancing the experience with automatic updates, bundled MCP, richer site information, and visual theming.

---

## 1. Config Hash & Auto-Updates

### Problem
Currently, if WordPress plugins/themes change or agent configs are updated, the desktop app has stale configuration files.

### Solution
Add a config hash system to detect when updates are available.

#### PHP Side
```php
// New endpoint: GET /wordforge/v1/desktop/config-hash
public function get_config_hash(): WP_REST_Response {
    $config_data = [
        'plugins_hash'  => md5(serialize(get_option('active_plugins'))),
        'theme_hash'    => md5(wp_get_theme()->get('Version')),
        'agents_hash'   => md5(serialize(AgentConfig::get_agents_for_display())),
        'providers_hash'=> md5(serialize(ProviderConfig::get_configured_providers())),
        'woo_active'    => class_exists('WooCommerce'),
    ];
    
    return new WP_REST_Response([
        'hash' => md5(serialize($config_data)),
        'components' => $config_data,
    ]);
}
```

#### Desktop Side
- Store config hash in `sites.json` alongside site data
- Periodically check hash (every 5 minutes or on app focus)
- Show update indicator in UI when hash differs
- "Update Config" button re-downloads ZIP and extracts

#### UI Indicator
```
┌─────────────────────────────┐
│ EmmaYé           🔄 Update  │  <- Badge when config outdated
│ https://emmaye.fr           │
└─────────────────────────────┘
```

---

## 2. Bundled MCP Client (Sidecar)

### Problem
Currently using remote MCP which adds latency. Local MCP would be faster.

### Solution
Bundle `wordforge-mcp.cjs` as a Tauri sidecar and run it locally.

#### Build Process
1. Build MCP package with bun: `bun build --compile --target=bun`
2. Include platform-specific binaries in Tauri bundle
3. Add new runtime: `RUNTIME_DESKTOP` in PHP

#### PHP Changes
```php
public const RUNTIME_DESKTOP = 'desktop';

// In get_mcp_config():
if (self::RUNTIME_DESKTOP === $runtime) {
    return [
        'type'        => 'local',
        'command'     => ['./wordforge-mcp'],  // Sidecar path
        'environment' => [
            'WORDPRESS_URL'          => $abilities_url,
            'WORDPRESS_USERNAME'     => $app_password_data['username'],
            'WORDPRESS_APP_PASSWORD' => $app_password_data['password'],
        ],
    ];
}
```

#### Tauri Changes
- Add sidecar configuration in `tauri.conf.json`
- Download/update sidecar binary alongside OpenCode
- Modify `opencode.json` generation to use local MCP path

#### Benefits
- ~50-100ms faster tool calls (no HTTP round-trip to WordPress for MCP protocol)
- Works offline for cached data
- Reduced WordPress server load

---

## 3. Site Dashboard Enhancement

### Problem
Current dashboard shows minimal info. Users need to open WordPress admin for basic stats.

### Solution
Create a mini WordPress dashboard in the desktop app.

#### New Endpoint
```php
// GET /wordforge/v1/desktop/site-stats
public function get_site_stats(): WP_REST_Response {
    $stats = [
        'content' => [
            'posts'    => wp_count_posts('post'),
            'pages'    => wp_count_posts('page'),
            'media'    => wp_count_posts('attachment'),
        ],
        'theme' => [
            'name'          => wp_get_theme()->get('Name'),
            'version'       => wp_get_theme()->get('Version'),
            'is_block_theme'=> wp_is_block_theme(),
            'screenshot'    => wp_get_theme()->get_screenshot(),
        ],
        'plugins' => [
            'active_count' => count(get_option('active_plugins')),
            'active'       => $this->get_active_plugins_summary(),
        ],
    ];
    
    if (class_exists('WooCommerce')) {
        $stats['woocommerce'] = [
            'products'       => wp_count_posts('product'),
            'orders_today'   => $this->get_orders_count('today'),
            'orders_week'    => $this->get_orders_count('week'),
            'revenue_today'  => $this->get_revenue('today'),
            'revenue_week'   => $this->get_revenue('week'),
            'low_stock'      => $this->get_low_stock_count(),
        ];
    }
    
    return new WP_REST_Response($stats);
}
```

#### Desktop UI Components
```
┌─────────────────────────────────────────────────────────┐
│ EmmaYé                                    [Open Admin]  │
│ https://emmaye.fr                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 Content          🎨 Theme              🔌 Plugins   │
│  ┌─────────────┐    ┌─────────────┐      ┌──────────┐  │
│  │ 12 Posts    │    │    Tove     │      │ 6 Active │  │
│  │ 5 Pages     │    │   v0.8.3    │      │          │  │
│  │ 234 Media   │    │ Block Theme │      │ Jetpack  │  │
│  └─────────────┘    └─────────────┘      │ WooCom.. │  │
│                                          └──────────┘  │
│  🛒 WooCommerce (if active)                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Today: €245.00 (3 orders)                      │   │
│  │  This Week: €1,234.00 (18 orders)               │   │
│  │  ⚠️ 2 products low on stock                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [━━━━━━━━━━ Start OpenCode ━━━━━━━━━━]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Quick Actions
- "Open Admin" → Opens WordPress admin in default browser
- "View Orders" → Opens WooCommerce orders page
- "Edit Theme" → Opens theme customizer
- Stats refresh on app focus or manual refresh

---

## 4. OpenCode Theme Configuration

### Problem
OpenCode UI doesn't match WordPress admin color scheme, creating visual disconnect.

### Solution
Extract WordPress admin colors and configure OpenCode theme.

#### PHP Side
```php
// Include in site-stats or separate endpoint
public function get_admin_colors(): array {
    $color_scheme = get_user_option('admin_color') ?: 'fresh';
    
    // WordPress admin color schemes
    $schemes = [
        'fresh'    => ['#1d2327', '#2c3338', '#2271b1', '#72aee6'],
        'light'    => ['#e5e5e5', '#999', '#0073aa', '#00a0d2'],
        'modern'   => ['#1e1e1e', '#3858e9', '#33f078', '#fff'],
        'blue'     => ['#096484', '#4796b3', '#52accc', '#74b6ce'],
        'midnight' => ['#25282b', '#363b3f', '#69a8bb', '#e14d43'],
        // ... other schemes
    ];
    
    return [
        'scheme' => $color_scheme,
        'colors' => $schemes[$color_scheme] ?? $schemes['fresh'],
        'css_vars' => [
            '--wp-admin-bg'      => $schemes[$color_scheme][0],
            '--wp-admin-text'    => $schemes[$color_scheme][1],
            '--wp-admin-accent'  => $schemes[$color_scheme][2],
            '--wp-admin-highlight'=> $schemes[$color_scheme][3],
        ],
    ];
}
```

#### Desktop Side
1. Fetch color scheme from WordPress
2. Generate OpenCode theme config
3. Write to `~/.config/opencode/theme.json` or pass via env

#### OpenCode Integration
```json
// opencode.json addition
{
  "theme": {
    "accent": "#2271b1",
    "background": "#1d2327",
    "foreground": "#f0f0f1",
    "selection": "#2c3338"
  }
}
```

---

## Implementation Priority

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Config Hash & Auto-Updates | Medium | High | P1 |
| Site Dashboard Enhancement | Medium | High | P1 |
| OpenCode Theme Config | Low | Medium | P2 |
| Bundled MCP Sidecar | High | Medium | P3 |

### Suggested Order
1. **Config Hash** - Foundation for keeping things in sync
2. **Site Dashboard** - Immediate user value
3. **Theme Config** - Quick win, improves polish
4. **Bundled MCP** - Performance optimization, can defer

---

## Technical Considerations

### Caching
- Cache site stats locally with 5-minute TTL
- Show cached data immediately, refresh in background
- Handle offline gracefully

### Error Handling
- Graceful degradation if WordPress unreachable
- Show last-known data with "offline" indicator
- Retry logic with exponential backoff

### Security
- All requests use app password authentication
- No sensitive data stored in plain text
- Credentials encrypted in system keychain (future)

---

## Open Questions

1. **MCP Sidecar Size**: Bun-compiled binary is ~50-80MB. Acceptable for desktop app?
2. **Update Frequency**: How often should config hash be checked? On focus? Timer?
3. **WooCommerce Depth**: How much order/product data to show? Privacy concerns?
4. **Theme Sync**: Should theme changes in WordPress auto-update OpenCode theme?
