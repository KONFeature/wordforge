import { z } from "zod";
import type { JSONSchema } from "zod/v4/core";
import { AbilitiesApiClient } from "./abilities-client.js";
import * as logger from "./logger.js";
import type { Ability, LoadedAbility, HttpMethod } from "./types.js";

export async function loadAbilities(
  client: AbilitiesApiClient,
  excludeCategories: string[]
): Promise<LoadedAbility[]> {
  const abilities = await client.listAbilities();
  
  // Remove non wordforge abilities (todo: should not be needed in the long run)
  let filtered = abilities.filter((a) => a.name.startsWith("wordforge/"));

  filtered = filterByCategory(filtered, excludeCategories);
  logger.info(
    `Filtered to ${filtered.length} abilities (excluded: ${excludeCategories.join(", ") || "none"})`
  );

  return filtered.map(convertToLoadedAbility);
}

function filterByCategory(
  abilities: Ability[],
  excludeCategories: string[]
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
        normalized.replace("wordforge-", ""),
      ];
    })
  );

  return abilities.filter((ability) => {
    const category = ability.category?.toLowerCase() ?? "";
    return !excluded.has(category);
  });
}

function getMcpType(ability: Ability): "tool" | "prompt" | "resource" {
  return ability.meta?.mcp?.type ?? "tool";
}

function getHttpMethod(ability: Ability): HttpMethod {
  const annotations = ability.meta?.annotations;

  if (annotations?.destructive) {
    return "DELETE";
  }

  if (annotations?.readonly) {
    return "GET";
  }

  const hasInput =
    ability.input_schema &&
    ability.input_schema.type === "object" &&
    ability.input_schema.properties &&
    Object.keys(ability.input_schema.properties).length > 0;

  return hasInput ? "POST" : "GET";
}

function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  try {
    return z.fromJSONSchema(schema as JSONSchema.JSONSchema);
  } catch (err) {
    logger.debug("Failed to convert JSON schema to Zod, using passthrough", err);
    return z.any();
  }
}

function convertToLoadedAbility(ability: Ability): LoadedAbility {
  const mcpName = ability.name.replace("wordforge/", "wordpress_");
  const mcpType = getMcpType(ability);
  const httpMethod = getHttpMethod(ability);

  const inputSchema = ability.input_schema
    ? jsonSchemaToZod(ability.input_schema)
    : z.object({});

  const outputSchema = ability.output_schema
    ? jsonSchemaToZod(ability.output_schema)
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
