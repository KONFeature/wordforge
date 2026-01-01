# AGENTS.md - WordForge Development Guide

## Project Structure
```
wordforge/                    # Bun monorepo
├── packages/
│   ├── php/                  # WordPress plugin (PHP 8.0+, WPCS)
│   ├── ui/                   # React admin UI (WordPress bundled React)
│   └── mcp/                  # MCP server for Claude Desktop (Node 18+)
├── biome.json                # Shared TS/JS linting/formatting
└── package.json              # Workspace root
```

## Commands

### Root
```bash
bun install                   # Install all dependencies
bun run build                 # Build all packages
bun run lint                  # Lint TypeScript/JavaScript
bun run lint:fix              # Auto-fix lint issues
bun run typecheck             # Type-check all packages
bun run test                  # Run all tests
bun run start                 # Start wp-env (localhost:8888)
```

### Package-specific
```bash
# @wordforge/mcp
cd packages/mcp
bun run build                 # Build with tsdown
bun run test                  # Run all tests
bun run test -- --run integration.test.ts           # Single file
bun run test -- --run "should list abilities"       # Single test by name
bun run typecheck             # Type-check

# @wordforge/ui
cd packages/ui
bun run build                 # Build React → packages/php/assets/js/
bun run start                 # Watch mode with HMR

# @wordforge/php
cd packages/php
composer install
composer run lint:php         # WordPress coding standards
composer run lint:php:fix     # Auto-fix
```

## Code Style

### TypeScript (Biome)
- 2-space indentation, single quotes, semicolons required
- `import type` for type-only imports
- `camelCase` functions/variables, `PascalCase` types/classes, `SCREAMING_SNAKE_CASE` constants
- Strict mode enabled - avoid `any`, use `unknown` and narrow types
- Never use `@ts-ignore` or `@ts-expect-error`

```typescript
// Import order: external → internal → types
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AbilitiesApiClient } from './abilities-client.js';
import type { Config } from './types.js';
```

### React (@wordforge/ui)
**CRITICAL: Use WordPress bundled React, never `import from 'react'`**
```typescript
import { useState, useEffect } from '@wordpress/element';
import { Button, Card, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
```

Components: Arrow functions, typed props, CSS Modules for styling.
```typescript
import styles from './MyComponent.module.css';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent = ({ title, onAction }: MyComponentProps) => {
  const [state, setState] = useState<string>('');
  return <div className={styles.container}>...</div>;
};
```

### PHP (WordPress Coding Standards)
- Tabs for indentation
- Spaces inside parentheses: `function_name( $arg )`
- Yoda conditions: `if ( 'value' === $variable )`
- PHP 8.0+ type declarations required
- Prefix hooks/filters with `wordforge_`

```php
<?php
declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

class ListContent extends AbstractAbility {
    public function execute( array $args ): array {
        // Validate early
        if ( ! post_type_exists( $args['post_type'] ) ) {
            return $this->error( 'Invalid post type', 'invalid_post_type' );
        }
        return $this->success( $data, 'Optional message' );
    }
}
```

## Error Handling

### TypeScript
```typescript
try {
  const result = await client.executeAbility(name, method, args);
  return { content: [...], structuredContent: result };
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Tool ${name} failed`, err);
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}
```

### PHP
```php
return $this->success( $data );       // Success response
return $this->error( 'msg', 'code' ); // Error response
```

## Testing (Vitest)

Tests in `packages/mcp/test/`. Globals enabled (`describe`, `it`, `expect`).

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('MyFeature', () => {
  let client: AbilitiesApiClient;

  beforeAll(() => {
    client = new AbilitiesApiClient(TEST_URL, TEST_USER, TEST_PASS);
  });

  it('should do something', async () => {
    const result = await client.executeAbility('wordforge/list-content', 'GET', {});
    expect(result.success).toBe(true);
  });
});
```

**Integration test env vars** (`.env` in packages/mcp):
```
TEST_WORDPRESS_URL=https://example.com/wp-json/wp-abilities/v1
TEST_WORDPRESS_USER=admin
TEST_WORDPRESS_PASS=xxxx xxxx xxxx
```

## Architecture

### MCP Package
- `src/index.ts` - MCP server bootstrap, registers tools/prompts/resources
- `abilities-client.ts` - HTTP client for WordPress Abilities API
- `ability-loader.ts` - Transforms WordPress abilities to MCP format

### UI Package
- Entry points: `src/chat/index.tsx`, `src/settings/index.tsx`
- Builds to `packages/php/assets/js/` via wp-scripts
- Window config: `window.wordforgeChat`, `window.wordforgeSettings`

### PHP Package
- Entry: `wordforge.php` - plugin bootstrap
- `AbilityRegistry.php` - registers abilities with WordPress
- `Abilities/AbstractAbility.php` - base class with `success()`, `error()`, `format_post()`
- Each ability implements: `get_title()`, `get_description()`, `get_input_schema()`, `execute()`

## Common Pitfalls

1. **React imports** - Always `@wordpress/element`, never `react` directly
2. **PHP "undefined function" errors** - WordPress functions work at runtime, not static analysis
3. **Type suppression** - Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
4. **Asset files** - `.asset.php` files are auto-generated by wp-scripts, don't edit manually
5. **Deploying** - Only deploy `packages/php/` contents to WordPress, not the monorepo
