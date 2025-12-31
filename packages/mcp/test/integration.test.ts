import { describe, it, expect, beforeAll } from "vitest";
import { AbilitiesApiClient } from "../src/abilities-client.js";
import { loadAbilities } from "../src/ability-loader.js";
import * as logger from "../src/logger.js";

const TEST_URL = process.env.TEST_WORDPRESS_URL;
const TEST_USER = process.env.TEST_WORDPRESS_USER;
const TEST_PASS = process.env.TEST_WORDPRESS_PASS;

if (!TEST_URL || !TEST_USER || !TEST_PASS) {
  console.log(TEST_URL, TEST_USER);
  throw new Error("Undefined integration test config");
}

describe("AbilitiesApiClient", () => {
  let client: AbilitiesApiClient;

  beforeAll(() => {
    logger.setDebug(process.env.DEBUG === "true");
    client = new AbilitiesApiClient(TEST_URL, TEST_USER, TEST_PASS);
  });

  it("should list abilities", async () => {
    const abilities = await client.listAbilities();
    expect(abilities.length).toBeGreaterThan(20);
    expect(abilities.some((a) => a.name === "wordforge/list-content")).toBe(true);
  });

  it("should return abilities with category field", async () => {
    const abilities = await client.listAbilities();
    const listContent = abilities.find((a) => a.name === "wordforge/list-content");
    expect(listContent).toBeDefined();
    expect(listContent?.category).toBeDefined();
  });

  it("should return abilities with input_schema", async () => {
    const abilities = await client.listAbilities();
    const listContent = abilities.find((a) => a.name === "wordforge/list-content");
    expect(listContent?.input_schema).toBeDefined();
    expect(listContent?.input_schema?.properties).toBeDefined();
  });

  it("should list categories", async () => {
    const categories = await client.listCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.some((c) => c.slug.includes("content"))).toBe(true);
  });

  it("should execute list-content ability with GET", async () => {
    const result = await client.executeAbility(
      "wordforge/list-content",
      "GET",
      { post_type: "post", per_page: 5 }
    );
    expect(result).toBeDefined();
    expect((result as { success: boolean }).success).toBe(true);
  });

  it("should execute seo-optimization prompt with POST", async () => {
    const result = await client.executeAbility(
      "wordforge/seo-optimization",
      "POST",
      { content: "Test content for SEO analysis", target_keyword: "SEO test" }
    );
    expect(result).toBeDefined();
    expect((result as { messages: unknown[] }).messages).toBeDefined();
  });
});

describe("AbilityLoader", () => {
  let client: AbilitiesApiClient;

  beforeAll(() => {
    logger.setDebug(process.env.DEBUG === "true");
    client = new AbilitiesApiClient(TEST_URL, TEST_USER, TEST_PASS);
  });

  it("should load all abilities", async () => {
    const abilities = await loadAbilities(client, []);
    expect(abilities.length).toBeGreaterThan(20);
    expect(abilities[0].mcpName).toMatch(/^wordpress_/);
    expect(abilities[0].inputSchema).toBeDefined();
  });

  it("should include mcpType for each ability", async () => {
    const abilities = await loadAbilities(client, []);
    expect(abilities.every((a) => ["tool", "prompt", "resource"].includes(a.mcpType))).toBe(true);
  });

  it("should include httpMethod for each ability", async () => {
    const abilities = await loadAbilities(client, []);
    expect(abilities.every((a) => ["GET", "POST", "DELETE"].includes(a.httpMethod))).toBe(true);
  });

  it("should filter abilities by category", async () => {
    const abilities = await loadAbilities(client, ["woocommerce"]);
    expect(abilities.some((a) => a.name.includes("product"))).toBe(false);
    expect(abilities.some((a) => a.name.includes("content"))).toBe(true);
  });

  it("should filter multiple categories", async () => {
    const abilities = await loadAbilities(client, ["woocommerce", "prompts"]);
    expect(abilities.some((a) => a.name.includes("product"))).toBe(false);
    expect(abilities.some((a) => a.name.includes("generate"))).toBe(false);
    expect(abilities.some((a) => a.name.includes("content"))).toBe(true);
  });

  it("should support short category names", async () => {
    const abilities = await loadAbilities(client, ["content"]);
    expect(abilities.some((a) => a.name === "wordforge/list-content")).toBe(false);
    expect(abilities.some((a) => a.name === "wordforge/get-global-styles")).toBe(true);
  });
});

interface ListResponse {
  success: boolean;
  data: {
    items: unknown[];
    total: number;
    [key: string]: unknown;
  };
}

describe("Tool Execution", () => {
  let client: AbilitiesApiClient;

  beforeAll(() => {
    logger.setDebug(process.env.DEBUG === "true");
    client = new AbilitiesApiClient(TEST_URL, TEST_USER, TEST_PASS);
  });

  it("should execute list-content and return structured response", async () => {
    const result = await client.executeAbility(
      "wordforge/list-content",
      "GET",
      { post_type: "page", per_page: 5 }
    ) as ListResponse;
    expect(result.success).toBe(true);
    expect(result.data.items).toBeInstanceOf(Array);
    expect(typeof result.data.total).toBe("number");
  });

  it("should execute list-templates and return structured response", async () => {
    const result = await client.executeAbility(
      "wordforge/list-templates",
      "GET",
      { type: "wp_template" }
    ) as ListResponse;
    expect(result.success).toBe(true);
    expect(result.data.items).toBeInstanceOf(Array);
    expect(typeof result.data.total).toBe("number");
  });

  it("should execute list-products and return structured response", async () => {
    const result = await client.executeAbility(
      "wordforge/list-products",
      "GET",
      { per_page: 5 }
    ) as ListResponse;
    expect(result.success).toBe(true);
    expect(result.data.items).toBeInstanceOf(Array);
    expect(typeof result.data.total).toBe("number");
  });

  it("should execute list-terms and return structured response", async () => {
    const result = await client.executeAbility(
      "wordforge/list-terms",
      "GET",
      { taxonomy: "category", per_page: 5 }
    ) as ListResponse;
    expect(result.success).toBe(true);
    expect(result.data.items).toBeInstanceOf(Array);
    expect(typeof result.data.total).toBe("number");
  });

  it("should execute list-media and return structured response", async () => {
    const result = await client.executeAbility(
      "wordforge/list-media",
      "GET",
      { per_page: 5 }
    ) as ListResponse;
    expect(result.success).toBe(true);
    expect(result.data.items).toBeInstanceOf(Array);
    expect(typeof result.data.total).toBe("number");
  });
});
