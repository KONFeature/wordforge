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
│   ├── Prompts/              # AI prompt templates
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
| WooCommerce | `wordforge-woocommerce` | Products |
| Prompts | `wordforge-prompts` | AI prompts |

## Common Pitfalls

1. **"Undefined function" errors** - WordPress functions (e.g., `get_posts`, `current_user_can`) work at runtime but not in static analysis. This is expected.

2. **Forgetting Yoda conditions** - WPCS requires `'value' === $var`, not `$var === 'value'`

3. **Missing spaces in parentheses** - `function( $arg )` not `function($arg)`

4. **Not sanitizing input** - Always use `sanitize_text_field()`, `absint()`, etc.

5. **Missing type declarations** - All public methods need return types
