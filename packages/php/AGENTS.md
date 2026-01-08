# @wordforge/php - WordPress Plugin

WordPress plugin providing MCP abilities for content, media, taxonomy, blocks, styles, and WooCommerce.

## Commands

```bash
composer install              # Install dependencies
composer run lint:php         # Lint (WPCS)
composer run lint:php:fix     # Auto-fix
./build.sh                    # Create dist/wordforge.zip
```

## Structure

```
includes/
├── Abilities/
│   ├── AbstractAbility.php   # Base class - extend this
│   ├── Traits/               # Pagination, delete patterns
│   ├── Content/              # Posts, pages, CPTs
│   ├── Media/                # Media library
│   ├── Taxonomy/             # Categories, tags, terms
│   ├── Blocks/               # Gutenberg blocks
│   ├── Styles/               # Global styles, theme.json
│   ├── Templates/            # FSE templates
│   ├── Comments/             # Comment moderation
│   ├── Users/                # User management
│   ├── Analytics/            # Jetpack stats (auto-detected)
│   ├── Orders/               # WooCommerce orders (auto-detected)
│   └── WooCommerce/          # Products (auto-detected)
├── Admin/                    # WordPress admin controllers
├── Mcp/                      # MCP server (wordpress/mcp-adapter)
│   └── ServerManager.php     # Ability discovery + registration
├── OpenCode/                 # OpenCode binary management
│   ├── BinaryManager.php     # Download/version management
│   ├── ServerProcess.php     # Spawn/stop server
│   ├── ActivityMonitor.php   # Auto-shutdown on idle
│   └── templates/            # Agent prompts, config
└── AbilityRegistry.php       # Central ability registration
```

## Code Style (WPCS)

```php
<?php
declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

class MyAbility extends AbstractAbility {
    // Tabs, spaces in parens, Yoda conditions
    public function execute( array $args ): array {
        if ( 'value' === $args['type'] ) {
            return $this->success( $data );
        }
        return $this->error( 'Message', 'error_code' );
    }
}
```

## Creating Abilities

1. Extend `AbstractAbility` in appropriate subdirectory
2. Implement required methods
3. Register in `AbilityRegistry.php`

### Required Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `get_title()` | `string` | Human-readable name |
| `get_description()` | `string` | AI agent description |
| `get_input_schema()` | `array` | JSON Schema for inputs |
| `execute(array)` | `array` | Business logic |

### Optional Overrides

| Method | Default | Purpose |
|--------|---------|---------|
| `get_category()` | `wordforge-content` | Category slug |
| `get_capability()` | `edit_posts` | Required WP capability |
| `is_read_only()` | `false` | GET vs POST |
| `is_destructive()` | `false` | Delete operations |

### Merged List+Get Pattern

Single ability for list and single-item retrieval:

```php
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListContent extends AbstractAbility {
    use PaginationSchemaTrait;

    public function execute( array $args ): array {
        if ( ! empty( $args['id'] ) ) {
            // Single item - MUST use paginated_success()
            return $this->paginated_success(
                [ $this->format_item( $item ) ],
                1, 1, [ 'page' => 1, 'per_page' => 1 ]
            );
        }
        // List mode
        return $this->paginated_success( $items, $total, $pages, $pagination );
    }
}
```

### Registration

```php
// In AbilityRegistry.php
( new Content\MyAbility() )->register( 'wordforge/my-ability' );
```

## Categories

| Slug | When Registered |
|------|-----------------|
| `wordforge-content` | Always |
| `wordforge-media` | Always |
| `wordforge-blocks` | Always |
| `wordforge-woocommerce` | WooCommerce active |
| `wordforge-analytics` | Jetpack active |

## Anti-Patterns

| Don't | Why |
|-------|-----|
| Skip Yoda conditions | WPCS requires `'value' === $var` |
| Omit type declarations | PHP 8.0+ required |
| Return raw item in merged ability | Must use `paginated_success()` |
| Forget `sanitize_text_field()` | Always sanitize input |
| Edit vendor files | Composer-managed |

## Notes

- PHP "undefined function" errors in IDE are expected (WordPress runtime)
- MCP server via `wordpress/mcp-adapter` composer dependency
- Abilities auto-register at `init` hook priority 10
