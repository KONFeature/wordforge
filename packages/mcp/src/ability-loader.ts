import { z } from 'zod';
import type { JSONSchema } from 'zod/v4/core';
import type { AbilitiesApiClient } from './abilities-client.js';
import * as logger from './logger.js';
import type {
  Ability,
  HttpMethod,
  JsonSchema,
  LoadedAbility,
} from './types.js';

export async function loadAbilities(
  client: AbilitiesApiClient,
  excludeCategories: string[],
): Promise<LoadedAbility[]> {
  const abilities = await client.listAbilities();

  // Remove non wordforge abilities (todo: should not be needed in the long run)
  let filtered = abilities.filter((a) => a.name.startsWith('wordforge/'));

  filtered = filterByCategory(filtered, excludeCategories);
  logger.info(
    `Filtered to ${filtered.length} abilities (excluded: ${excludeCategories.join(', ') || 'none'})`,
  );

  return filtered.map(convertToLoadedAbility);
}

function filterByCategory(
  abilities: Ability[],
  excludeCategories: string[],
): Ability[] {
  if (excludeCategories.length === 0) {
    return abilities;
  }

  const excluded = new Set(
    excludeCategories.flatMap((c) => {
      const normalized = c.toLowerCase().trim();
      return [
        normalized,
        `wordforge-${normalized}`,
        normalized.replace('wordforge-', ''),
      ];
    }),
  );

  return abilities.filter((ability) => {
    const category = ability.category?.toLowerCase() ?? '';
    return !excluded.has(category);
  });
}

function getMcpType(ability: Ability): 'tool' | 'prompt' | 'resource' {
  return ability.meta?.mcp?.type ?? 'tool';
}

function getHttpMethod(ability: Ability): HttpMethod {
  const isReadOnly = ability.meta?.annotations?.readonly;
  return isReadOnly ? 'GET' : 'POST';
}

/**
 * Recursively transform a JSON Schema to accept string values for integer/number types.
 * MCP clients often transmit numeric parameters as strings (e.g., "16" instead of 16).
 * This ensures validation passes by allowing both types.
 */
function makeIntegersAcceptStrings(schema: JsonSchema): JsonSchema {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const result = { ...schema };
  let madeUnion = false;

  // Transform integer/number types to accept strings
  if (result.type === 'integer' || result.type === 'number') {
    result.type = [result.type, 'string'];
    madeUnion = true;
  }

  // Handle array of types (e.g., ['integer', 'null'])
  if (Array.isArray(result.type)) {
    const hasInteger = result.type.includes('integer');
    const hasNumber = result.type.includes('number');
    const hasString = result.type.includes('string');

    if ((hasInteger || hasNumber) && !hasString) {
      result.type = [...result.type, 'string'];
      madeUnion = true;
    }
  }

  // Numeric constraints cause Zod union failures when mixed with string type
  if (madeUnion) {
    delete result.minimum;
    delete result.maximum;
    // @ts-ignore
    delete result.exclusiveMinimum;
    // @ts-ignore
    delete result.exclusiveMaximum;
    // @ts-ignore
    delete result.multipleOf;
  }

  // Recursively process nested properties
  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([key, value]) => [
        key,
        makeIntegersAcceptStrings(value as JsonSchema),
      ]),
    );
  }

  // Process array items
  if (result.items) {
    result.items = makeIntegersAcceptStrings(result.items as JsonSchema);
  }

  return result;
}

function jsonSchemaToZod(
  schema: unknown,
  coerceIntegers = false,
): z.ZodTypeAny {
  try {
    let processedSchema = schema;
    if (coerceIntegers) {
      processedSchema = makeIntegersAcceptStrings(schema as JsonSchema);
    }
    return z.fromJSONSchema(processedSchema as JSONSchema.JSONSchema);
  } catch (err) {
    logger.debug(
      'Failed to convert JSON schema to Zod, using passthrough',
      err,
    );
    return z.any();
  }
}

function convertToLoadedAbility(ability: Ability): LoadedAbility {
  const mcpName = ability.name.replace('wordforge/', 'wordpress_');
  const mcpType = getMcpType(ability);
  const httpMethod = getHttpMethod(ability);

  const inputSchema = ability.input_schema
    ? jsonSchemaToZod(ability.input_schema, true)
    : z.object({});

  const outputSchema = ability.output_schema
    ? jsonSchemaToZod(ability.output_schema, false)
    : undefined;

  return {
    name: ability.name,
    mcpName,
    label: ability.label,
    description: ability.description,
    category: ability.category,
    inputSchema,
    outputSchema,
    mcpType,
    httpMethod,
    annotations: {
      title: ability.label,
      readOnlyHint: ability.meta?.annotations?.readonly,
      destructiveHint: ability.meta?.annotations?.destructive,
      idempotentHint: ability.meta?.annotations?.idempotent,
    },
  };
}

export type { LoadedAbility };
