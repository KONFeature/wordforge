# @wordforge/mcp - MCP Server

Node.js MCP server that connects Claude Desktop (or other MCP clients) to WordPress via the Abilities API.

## Commands

```bash
bun run build                 # Build with tsdown → dist/
bun run dev                   # Watch mode
bun run typecheck             # Type-check (tsc --noEmit)

# Testing (Vitest)
bun run test                  # Run all tests
bun run test -- --run integration.test.ts           # Single file
bun run test -- --run "should list abilities"       # Single test by name
bun run test:watch            # Watch mode
```

## Directory Structure

```
src/
├── index.ts              # Entry point - boots MCP server
├── abilities-client.ts   # HTTP client for WordPress Abilities API
├── ability-loader.ts     # Transforms abilities → MCP tools/prompts/resources
├── logger.ts             # Structured logging to stderr
└── types.ts              # Shared type definitions

test/
└── integration.test.ts   # Integration tests (requires WordPress)
```

## Environment Variables

```bash
# Required
WORDPRESS_URL="https://example.com/wp-json/wp-abilities/v1"
WORDPRESS_USERNAME="admin"
WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# Optional
WORDFORGE_EXCLUDE_CATEGORIES="woocommerce,prompts"  # Comma-separated
WORDFORGE_DEBUG="true"                               # Verbose logging
```

## Code Style

### Imports
```typescript
// 1. External packages
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// 2. Internal modules (with .js extension for ESM)
import { AbilitiesApiClient } from './abilities-client.js';
import * as logger from './logger.js';

// 3. Types (use `import type`)
import type { Config, Ability } from './types.js';
```

### Naming
- `camelCase` for variables, functions, methods
- `PascalCase` for types, interfaces, classes
- `SCREAMING_SNAKE_CASE` for constants

### Error Handling
```typescript
try {
  const result = await client.executeAbility(name, method, args);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Tool ${name} failed`, err);
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}
```

### HTTP Client Pattern
```typescript
// Always specify method types
type HttpMethod = 'GET' | 'POST' | 'DELETE';

// Use retry logic for resilience
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

// Serialize input as PHP-style query params for GET/DELETE
// input[key]=value format for WordPress REST API
```

## Testing

### Setup
Create `.env` in `packages/mcp/`:
```
TEST_WORDPRESS_URL=https://example.com/wp-json/wp-abilities/v1
TEST_WORDPRESS_USER=admin
TEST_WORDPRESS_PASS=xxxx xxxx xxxx
```

### Test Structure
```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('AbilitiesApiClient', () => {
  let client: AbilitiesApiClient;

  beforeAll(() => {
    client = new AbilitiesApiClient(TEST_URL, TEST_USER, TEST_PASS);
  });

  it('should list abilities', async () => {
    const abilities = await client.listAbilities();
    expect(abilities.length).toBeGreaterThan(20);
  });

  it('should execute ability with GET', async () => {
    const result = await client.executeAbility(
      'wordforge/list-content',
      'GET',
      { post_type: 'post', per_page: 5 },
    );
    expect((result as { success: boolean }).success).toBe(true);
  });
});
```

### Vitest Config
- Globals enabled: `describe`, `it`, `expect` available without import
- 30s timeout for integration tests
- `.env` auto-loaded via `dotenv/config`

## MCP Registration

### Tools (most abilities)
```typescript
server.registerTool(
  ability.mcpName,           // e.g., "wordpress_list_content"
  {
    title: ability.label,
    description: ability.description,
    inputSchema: ability.inputSchema,   // Zod schema
    outputSchema: ability.outputSchema,
    annotations: ability.annotations,   // readonly, destructive, idempotent
  },
  async (args) => { /* handler */ },
);
```

### Prompts (AI prompt templates)
```typescript
server.registerPrompt(
  ability.mcpName,
  {
    title: ability.label,
    description: ability.description,
    argsSchema: ability.inputSchema,
  },
  async (args) => ({
    messages: result.messages,  // Returned from WordPress
  }),
);
```

### Resources (read-only data)
```typescript
server.registerResource(
  ability.mcpName,
  new ResourceTemplate(`wordpress://${name}`, { list: undefined }),
  { title, description, mimeType: 'application/json' },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text }],
  }),
);
```

## Common Pitfalls

1. **Missing `.js` extension** - ESM requires explicit extensions: `./types.js` not `./types`

2. **Type narrowing** - Always narrow `unknown` before use, avoid `as any`

3. **Test env vars** - Tests will throw if `TEST_WORDPRESS_*` vars are missing

4. **Zod v4** - Uses `zod@4.0.0`, schemas created via `z.object({...})`

5. **MCP SDK types** - Some SDK types require `as const` assertions for literals
