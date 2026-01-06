# @wordforge/php - WordPress Plugin

WordPress plugin providing MCP abilities for content, media, taxonomy, blocks, styles, and WooCommerce.

## Commands

```bash
composer install              # Install dependencies
composer run lint:php         # Lint (WordPress Coding Standards)
composer run lint:php:fix     # Auto-fix lint issues
```

## Directory Structure

```
includes/
├── Abilities/
│   ├── AbstractAbility.php   # Base class - extend this
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
├── Admin/                    # WordPress admin UI
├── Mcp/                      # MCP server integration
├── OpenCode/                 # OpenCode agent config
└── AbilityRegistry.php       # Registers all abilities
```

## Code Style (WordPress Coding Standards)

### Formatting
- **Tabs** for indentation (not spaces)
- Spaces inside parentheses: `function_name( $arg1, $arg2 )`
- Yoda conditions: `if ( 'value' === $variable )`
- Braces on same line: `class Foo {`

### File Header
```php
<?php
/**
 * Brief description of the file.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;
```

### Naming
- `snake_case` for functions, variables, methods
- `PascalCase` for classes
- `SCREAMING_SNAKE_CASE` for constants
- Prefix hooks/filters with `wordforge_`

### Type Declarations (PHP 8.0+)
```php
public function execute( array $args ): array { ... }
protected function success( mixed $data, string $message = '' ): array { ... }
public function get_capability(): string|array { ... }
```

## Creating a New Ability

1. Create class in appropriate `Abilities/` subdirectory
2. Extend `AbstractAbility`
3. Implement required methods
4. Register in `AbilityRegistry.php`

### Ability Template
```php
<?php
declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

class MyAbility extends AbstractAbility {

    public function get_category(): string {
        return 'wordforge-content';  // Used for filtering
    }

    protected function is_read_only(): bool {
        return false;  // true = GET, false = POST
    }

    protected function is_destructive(): bool {
        return false;  // true for delete operations
    }

    public function get_title(): string {
        return __( 'My Ability', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Detailed description for AI agents.', 'wordforge' );
    }

    public function get_capability(): string|array {
        return 'edit_posts';  // Required WordPress capability
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'id' => [
                    'type'        => 'integer',
                    'description' => 'The item ID.',
                    'minimum'     => 1,
                ],
            ],
            'required'   => [ 'id' ],
        ];
    }

    public function execute( array $args ): array {
        // Validate early
        if ( empty( $args['id'] ) ) {
            return $this->error( 'ID is required.', 'missing_id' );
        }

        // Do work...
        $data = [ 'id' => $args['id'] ];

        return $this->success( $data, 'Operation completed.' );
    }
}
```

### Response Helpers
```php
// Success with data
return $this->success( $data );
return $this->success( $data, 'Optional message' );

// Error with code
return $this->error( 'Error message', 'error_code' );

// Format a post for response
$formatted = $this->format_post( $post );
```

### Registering the Ability
In `AbilityRegistry.php`:
```php
( new Content\MyAbility() )->register( 'wordforge/my-ability' );
```

## Categories

| Category | Slug | Description |
|----------|------|-------------|
| Content | `wordforge-content` | Posts, pages, CPTs |
| Media | `wordforge-media` | Media library |
| Taxonomy | `wordforge-taxonomy` | Terms, categories, tags |
| Blocks | `wordforge-blocks` | Gutenberg blocks |
| Styles | `wordforge-styles` | Theme styling |
| Templates | `wordforge-templates` | FSE templates |
| Comments | `wordforge-comments` | Comment moderation |
| Users | `wordforge-users` | User management |
| Analytics | `wordforge-analytics` | Jetpack stats (auto-detected) |
| Orders | `wordforge-orders` | WooCommerce orders (auto-detected) |
| WooCommerce | `wordforge-woocommerce` | Products (auto-detected) |

## Input Schema Best Practices

### Type Selection Guide

Use `integer` type for pure numeric IDs. Use `string` type only when a parameter can accept multiple formats (e.g., ID or slug).

```php
// ✅ CORRECT - Integer for pure IDs
'id' => [
    'type'        => 'integer',
    'description' => 'The item ID.',
    'minimum'     => 1,
],
'per_page' => [
    'type'        => 'integer',
    'description' => 'Items per page.',
    'minimum'     => 1,
    'maximum'     => 100,
    'default'     => 20,
],

// ✅ CORRECT - String when accepting ID OR slug
'identifier' => [
    'type'        => 'string',
    'description' => 'Item ID or slug.',
],
```

### Merged List + Get Pattern

Combine list and get-single into one ability using an optional `id` parameter. **CRITICAL**: Single-item mode MUST use the same paginated output format as list mode to match the output schema.

```php
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListContent extends AbstractAbility {
    use PaginationSchemaTrait;

    public function get_output_schema(): array {
        // Use pagination output schema - applies to BOTH list and single modes
        return $this->get_pagination_output_schema(
            $this->get_item_schema(),
            'Content items.'
        );
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => array_merge(
                [
                    'id' => [
                        'type'        => 'integer',
                        'description' => 'Item ID. If provided, returns single item. If omitted, returns list.',
                        'minimum'     => 1,
                    ],
                ],
                $this->get_pagination_input_schema( [ 'date', 'title', 'id' ] )
            ),
        ];
    }

    public function execute( array $args ): array {
        // Single item mode - MUST use paginated_success()
        if ( ! empty( $args['id'] ) ) {
            $item = get_post( $args['id'] );
            if ( ! $item ) {
                return $this->error( 'Item not found.', 'not_found' );
            }
            // Wrap single item in pagination format
            return $this->paginated_success(
                [ $this->format_item( $item ) ],  // items as array with 1 element
                1,                                 // total
                1,                                 // total_pages
                [ 'page' => 1, 'per_page' => 1 ]   // pagination
            );
        }

        // List mode
        $pagination = $this->normalize_pagination_args( $args );
        $query = new \WP_Query( $query_args );
        $items = array_map( [ $this, 'format_item' ], $query->posts );
        return $this->paginated_success( $items, $query->found_posts, $query->max_num_pages, $pagination );
    }
}
```

**Key Rules:**
- Output schema uses `get_pagination_output_schema()` for consistency
- Single-item mode returns `paginated_success()` with `items: [single_item]`
- Never return raw item from single-item mode (breaks output schema contract)

**Benefits:**
- Reduces MCP tool count (fewer tools = faster AI reasoning)
- Consistent API pattern across abilities
- Output always matches schema (items array, total, pages)

## Common Pitfalls

1. **"Undefined function" errors** - WordPress functions (e.g., `get_posts`, `current_user_can`) work at runtime but not in static analysis. This is expected.

2. **Forgetting Yoda conditions** - WPCS requires `'value' === $var`, not `$var === 'value'`

3. **Missing spaces in parentheses** - `function( $arg )` not `function($arg)`

4. **Not sanitizing input** - Always use `sanitize_text_field()`, `absint()`, etc.

5. **Missing type declarations** - All public methods need return types

6. **Output schema mismatch in merged abilities** - When implementing list+get merged abilities, single-item mode MUST return paginated format (`paginated_success()`) to match the output schema. Never return raw items directly.
