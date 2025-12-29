import { z } from "zod";
import { WordPressClient } from "./wordpress-client.js";
import * as logger from "./logger.js";
import type { AbilitySchema, AbilitySummary } from "./types.js";
import type { JSONSchema } from "zod/v4/core";

export interface LoadedAbility {
  name: string;
  mcpName: string;
  label: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  annotations: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
}

export async function loadAbilities(
  client: WordPressClient,
  excludeCategories: string[]
): Promise<LoadedAbility[]> {
  const abilities = await client.discoverAbilities();

  const filtered = filterByCategory(abilities, excludeCategories);
  logger.info(
    `Filtered to ${filtered.length} abilities (excluded: ${excludeCategories.join(", ") || "none"})`
  );

  const schemas = await fetchSchemas(client, filtered);

  console.log("Schemas", schemas)

  return schemas.map(convertToLoadedAbility);
}

function filterByCategory(
  abilities: AbilitySummary[],
  excludeCategories: string[]
): AbilitySummary[] {
  if (excludeCategories.length === 0) {
    return abilities;
  }

  const excludedNames = new Set<string>();

  for (const category of excludeCategories) {
    const categoryKey = category.toLowerCase().trim();
    const abilityNames = getCategoryAbilities(categoryKey);
    for (const name of abilityNames) {
      excludedNames.add(name);
    }
  }

  return abilities.filter((ability) => !excludedNames.has(ability.name));
}

function getCategoryAbilities(category: string): string[] {
  const map: Record<string, string[]> = {
    content: [
      "wordforge/list-content",
      "wordforge/get-content",
      "wordforge/save-content",
      "wordforge/delete-content",
    ],
    blocks: ["wordforge/get-page-blocks", "wordforge/update-page-blocks"],
    styles: [
      "wordforge/get-global-styles",
      "wordforge/update-global-styles",
      "wordforge/get-block-styles",
    ],
    media: [
      "wordforge/list-media",
      "wordforge/get-media",
      "wordforge/upload-media",
      "wordforge/update-media",
      "wordforge/delete-media",
    ],
    taxonomy: [
      "wordforge/list-terms",
      "wordforge/save-term",
      "wordforge/delete-term",
    ],
    templates: [
      "wordforge/list-templates",
      "wordforge/get-template",
      "wordforge/update-template",
    ],
    woocommerce: [
      "wordforge/list-products",
      "wordforge/get-product",
      "wordforge/create-product",
      "wordforge/update-product",
      "wordforge/delete-product",
    ],
    prompts: [
      "wordforge/generate-content",
      "wordforge/review-content",
      "wordforge/seo-optimization",
    ],
  };

  return map[category] ?? [];
}

async function fetchSchemas(
  client: WordPressClient,
  abilities: AbilitySummary[]
): Promise<AbilitySchema[]> {
  logger.debug(`Fetching schemas for ${abilities.length} abilities`);

  const results = await Promise.all(
    abilities.map(async (ability) => {
      try {
        return await client.getAbilityInfo(ability.name);
      } catch (err) {
        logger.error(`Failed to fetch schema for ${ability.name}`, err);
        return null;
      }
    })
  );

  return results.filter((r): r is AbilitySchema => r !== null);
}

function convertToLoadedAbility(schema: AbilitySchema): LoadedAbility {
  const mcpName = schema.name.replace("wordforge/", "wordpress/");

  let inputSchema: z.ZodTypeAny;
  let outputSchema: z.ZodTypeAny | undefined = undefined;
  try {
    inputSchema = z.fromJSONSchema(schema.input_schema as JSONSchema.JSONSchema);
    outputSchema = schema.output_schema ? z.fromJSONSchema(schema.output_schema as JSONSchema.JSONSchema) : undefined;
  } catch (err) {
    logger.debug(`Failed to convert schema for ${schema.name}, using passthrough`, err);
    inputSchema = z.any();
  }

  return {
    name: schema.name,
    mcpName,
    label: schema.label,
    description: schema.description,
    inputSchema,
    outputSchema,
    annotations: {
      readOnlyHint: schema.meta?.annotations?.readonly,
      destructiveHint: schema.meta?.annotations?.destructive,
      idempotentHint: schema.meta?.annotations?.idempotent,
    },
  };
}
