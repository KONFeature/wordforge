import { describe, expect, it, vi } from 'vitest';
import type { AbilitiesApiClient } from '../src/abilities-client.js';
import { loadAbilities } from '../src/ability-loader.js';
import type { Ability } from '../src/types.js';

const createMockClient = (abilities: Ability[]): AbilitiesApiClient => ({
  listAbilities: vi.fn().mockResolvedValue(abilities),
  listCategories: vi.fn().mockResolvedValue([]),
  executeAbility: vi.fn().mockResolvedValue({ success: true }),
});

const createAbility = (overrides: Partial<Ability> = {}): Ability => ({
  name: 'wordforge/test-ability',
  label: 'Test Ability',
  description: 'A test ability',
  category: 'wordforge-content',
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
    },
  },
  ...overrides,
});

describe('loadAbilities', () => {
  it('should transform ability name to MCP format', async () => {
    const client = createMockClient([createAbility()]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].mcpName).toBe('wordpress_test-ability');
    expect(loaded[0].name).toBe('wordforge/test-ability');
  });

  it('should filter out non-wordforge abilities', async () => {
    const client = createMockClient([
      createAbility({ name: 'wordforge/valid' }),
      createAbility({ name: 'other-plugin/invalid' }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('wordforge/valid');
  });

  it('should filter by category with full slug', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/content',
        category: 'wordforge-content',
      }),
      createAbility({ name: 'wordforge/media', category: 'wordforge-media' }),
    ]);
    const loaded = await loadAbilities(client, ['wordforge-content']);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('wordforge/media');
  });

  it('should filter by category with short name', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/content',
        category: 'wordforge-content',
      }),
      createAbility({ name: 'wordforge/media', category: 'wordforge-media' }),
    ]);
    const loaded = await loadAbilities(client, ['content']);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('wordforge/media');
  });

  it('should filter multiple categories', async () => {
    const client = createMockClient([
      createAbility({ name: 'wordforge/a', category: 'wordforge-content' }),
      createAbility({ name: 'wordforge/b', category: 'wordforge-media' }),
      createAbility({ name: 'wordforge/c', category: 'wordforge-styles' }),
    ]);
    const loaded = await loadAbilities(client, ['content', 'media']);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('wordforge/c');
  });

  it('should preserve all abilities when no exclusions', async () => {
    const client = createMockClient([
      createAbility({ name: 'wordforge/a' }),
      createAbility({ name: 'wordforge/b' }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded).toHaveLength(2);
  });
});

describe('HTTP method detection', () => {
  it('should use DELETE for destructive abilities', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/delete-thing',
        meta: { annotations: { destructive: true } },
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].httpMethod).toBe('DELETE');
  });

  it('should use GET for readonly abilities', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/get-thing',
        meta: { annotations: { readonly: true } },
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].httpMethod).toBe('GET');
  });

  it('should use POST for abilities with input schema', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/save-thing',
        input_schema: {
          type: 'object',
          properties: { title: { type: 'string' } },
        },
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].httpMethod).toBe('POST');
  });

  it('should use GET for abilities without input schema', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/list-thing',
        input_schema: undefined,
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].httpMethod).toBe('GET');
  });

  it('should prioritize destructive over readonly', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/thing',
        meta: { annotations: { destructive: true, readonly: true } },
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].httpMethod).toBe('DELETE');
  });
});

describe('MCP type detection', () => {
  it('should default to tool type', async () => {
    const client = createMockClient([createAbility()]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].mcpType).toBe('tool');
  });

  it('should use prompt type when specified', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/generate',
        meta: { mcp: { type: 'prompt' } },
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].mcpType).toBe('prompt');
  });

  it('should use resource type when specified', async () => {
    const client = createMockClient([
      createAbility({
        name: 'wordforge/data',
        meta: { mcp: { type: 'resource' } },
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].mcpType).toBe('resource');
  });
});

describe('annotations', () => {
  it('should include title from label', async () => {
    const client = createMockClient([
      createAbility({ label: 'My Test Ability' }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].annotations.title).toBe('My Test Ability');
  });

  it('should include readonly hint', async () => {
    const client = createMockClient([
      createAbility({ meta: { annotations: { readonly: true } } }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].annotations.readOnlyHint).toBe(true);
  });

  it('should include destructive hint', async () => {
    const client = createMockClient([
      createAbility({ meta: { annotations: { destructive: true } } }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].annotations.destructiveHint).toBe(true);
  });

  it('should include idempotent hint', async () => {
    const client = createMockClient([
      createAbility({ meta: { annotations: { idempotent: true } } }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].annotations.idempotentHint).toBe(true);
  });
});

describe('schema conversion', () => {
  it('should create input schema from ability schema', async () => {
    const client = createMockClient([
      createAbility({
        input_schema: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
          },
          required: ['id'],
        },
      }),
    ]);
    const loaded = await loadAbilities(client, []);

    expect(loaded[0].inputSchema).toBeDefined();
    const parsed = loaded[0].inputSchema.safeParse({ id: 1, title: 'test' });
    expect(parsed.success).toBe(true);
  });

  it('should use empty object schema when no input schema', async () => {
    const client = createMockClient([
      createAbility({ input_schema: undefined }),
    ]);
    const loaded = await loadAbilities(client, []);

    const parsed = loaded[0].inputSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });
});
