# AGENTS.md - WordForge Development Guide

## Project Structure

```
wordforge/                    # Bun monorepo
├── packages/
│   ├── php/                  # @wordforge/php - WordPress plugin
│   ├── ui/                   # @wordforge/ui - React admin UI (WordPress bundled React)
│   └── mcp/                  # @wordforge/mcp - MCP server for Claude Desktop
├── biome.json                # Shared linting/formatting
└── package.json              # Workspace root
```

## Commands

### Root (from project root)
```bash
bun install                   # Install all dependencies
bun run build                 # Build all packages
bun run lint                  # Lint all TypeScript/JavaScript
bun run lint:fix              # Auto-fix lint issues
bun run typecheck             # Type-check all packages
bun run test                  # Run all tests
bun run start                 # Start wp-env (WordPress local dev)
bun run stop                  # Stop wp-env
./deploy.sh                   # Build UI + deploy to server (requires .env)
```

### Package-specific
```bash
# @wordforge/ui
cd packages/ui
bun run build                 # Build React bundles → packages/php/assets/js/
bun run start                 # Watch mode with HMR
bun run typecheck             # Type-check UI code

# @wordforge/mcp
cd packages/mcp
bun run build                 # Build with tsdown
bun run dev                   # Watch mode
bun run test                  # Run all tests
bun run test -- --run integration.test.ts           # Single test file
bun run test -- --run "should list abilities"       # Single test by name
bun run typecheck             # Type-check MCP code

# @wordforge/php
cd packages/php
composer install              # Install PHP dependencies
composer run lint:php         # Lint PHP (WordPress coding standards)
composer run lint:php:fix     # Auto-fix PHP lint issues
```

## Code Style

### TypeScript (Biome)

**Formatting:**
- 2-space indentation
- Single quotes
- Semicolons required
- Organize imports enabled

**Imports order:**
```typescript
// 1. Node/external packages
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { useState, useEffect } from '@wordpress/element';

// 2. Internal modules (relative)
import { AbilitiesApiClient } from "./abilities-client.js";
import { ChatApiClient } from './api';

// 3. Types (use `import type` for type-only imports)
import type { Config } from "./types.js";
```

**Naming:**
- `camelCase` for variables, functions, methods
- `PascalCase` for types, interfaces, classes, React components
- `SCREAMING_SNAKE_CASE` for constants
- Prefix interfaces with context, not `I`: `WordForgeConfig` not `IConfig`

**Types:**
- Strict mode enabled (`strict: true`)
- Avoid `any` - use `unknown` and narrow types
- Use `type` for object shapes, `interface` for extendable contracts
- Export types from dedicated `types.ts` files

### React (@wordforge/ui)

**CRITICAL: Use WordPress bundled React, not external React.**
```typescript
// CORRECT
import { useState, useEffect } from '@wordpress/element';
import { Button, Card, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// WRONG - never import from 'react' directly
import { useState } from 'react';
```

**Component patterns:**
```typescript
// Functional components with arrow functions
export const MyComponent = () => {
  const [state, setState] = useState<string>('');
  // ...
  return <div>...</div>;
};

// Props typing
interface MyComponentProps {
  title: string;
  onAction: () => void;
}
export const MyComponent = ({ title, onAction }: MyComponentProps) => { ... };
```

**Styling:** Inline styles or WordPress component defaults. No external CSS frameworks.

### PHP (@wordforge/php)

**Standards:** WordPress Coding Standards (WPCS)

**Formatting:**
- Tabs for indentation
- Spaces inside parentheses: `function_name( $arg )`
- Yoda conditions: `if ( 'value' === $variable )`
- Braces on same line for functions/classes

**File structure:**
```php
<?php
/**
 * Brief description.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

class ListContent extends AbstractAbility {
    // ...
}
```

**Naming:**
- `snake_case` for functions, variables, methods
- `PascalCase` for classes
- `SCREAMING_SNAKE_CASE` for constants
- Prefix hooks/filters with `wordforge_`

**Type declarations:** Use PHP 8.0+ types
```php
public function execute( array $args ): array { ... }
protected function success( mixed $data, string $message = '' ): array { ... }
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
// Use AbstractAbility helper methods
return $this->success( $data, 'Optional message' );
return $this->error( 'Error message', 'error_code' );

// Validate early
if ( ! post_type_exists( $post_type ) ) {
    return $this->error(
        sprintf( 'Post type "%s" does not exist.', $post_type ),
        'invalid_post_type'
    );
}
```

## Testing

### Vitest (@wordforge/mcp)
```typescript
import { describe, it, expect, beforeAll } from "vitest";

describe("AbilitiesApiClient", () => {
  let client: AbilitiesApiClient;

  beforeAll(() => {
    client = new AbilitiesApiClient(TEST_URL, TEST_USER, TEST_PASS);
  });

  it("should list abilities", async () => {
    const abilities = await client.listAbilities();
    expect(abilities.length).toBeGreaterThan(20);
    expect(abilities.some((a) => a.name === "wordforge/list-content")).toBe(true);
  });
});
```

**Test env vars** (in `.env` for integration tests):
```
TEST_WORDPRESS_URL=https://example.com/wp-json/wp-abilities/v1
TEST_WORDPRESS_USER=admin
TEST_WORDPRESS_PASS=xxxx xxxx xxxx
```

## Architecture Notes

### MCP Package
- Entry: `src/index.ts` - boots MCP server, registers tools/prompts/resources
- `abilities-client.ts` - HTTP client for WordPress Abilities API
- `ability-loader.ts` - Transforms WordPress abilities to MCP format
- Tools use Zod schemas converted from JSON Schema

### UI Package
- Entry points: `src/chat/index.tsx`, `src/settings/index.tsx`
- Builds to `packages/php/assets/js/` via webpack
- Uses SSE for real-time updates (chat)
- Window config: `window.wordforgeChat`, `window.wordforgeSettings`

### PHP Package
- Entry: `wordforge.php` - plugin bootstrap
- `AbilityRegistry.php` - registers all abilities with WordPress
- `Abilities/AbstractAbility.php` - base class with helpers
- Each ability: `get_title()`, `get_description()`, `get_input_schema()`, `execute()`

## Common Pitfalls

1. **PHP "undefined function" errors** - WordPress functions aren't available to static analyzers. They work at runtime.

2. **React imports** - Always use `@wordpress/element`, never `react` directly.

3. **Deploying** - Only deploy `packages/php/` contents to WordPress, not the entire monorepo.

4. **Type suppression** - Never use `as any`, `@ts-ignore`, or `@ts-expect-error`.

5. **Asset versioning** - The `.asset.php` files are auto-generated by wp-scripts. Don't edit manually.
