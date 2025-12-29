import { describe, it, expect, beforeAll } from "vitest";
import { WordPressClient } from "../src/wordpress-client.js";
import { loadAbilities } from "../src/ability-loader.js";
import * as logger from "../src/logger.js";

const TEST_URL = process.env.TEST_WORDPRESS_URL;
const TEST_USER = process.env.TEST_WORDPRESS_USER;
const TEST_PASS = process.env.TEST_WORDPRESS_PASS;

if (!TEST_URL || !TEST_USER || !TEST_PASS) {
  console.log(TEST_URL, TEST_USER)
  throw new Error("Undefined integration test config");
}

describe("WordPressClient", () => {
  let client: WordPressClient;

  beforeAll(() => {
    logger.setDebug(process.env.DEBUG === "true");
    client = new WordPressClient(TEST_URL, TEST_USER, TEST_PASS);
  });

  it("should initialize session", async () => {
    const result = await client.initialize();
    expect(result.serverInfo.name).toBe("WordForge MCP Server");
    expect(result.protocolVersion).toBeDefined();
  });

  it("should discover abilities", async () => {
    const abilities = await client.discoverAbilities();
    expect(abilities.length).toBeGreaterThan(20);
    expect(abilities.some((a) => a.name === "wordforge/list-content")).toBe(true);
  });

  it("should get ability info", async () => {
    const schema = await client.getAbilityInfo("wordforge/list-content");
    expect(schema.name).toBe("wordforge/list-content");
    expect(schema.input_schema).toBeDefined();
    expect(schema.input_schema.properties).toBeDefined();
  });

  it("should execute list-content ability", async () => {
    const result = await client.executeAbility("wordforge/list-content", {
      post_type: "post",
      per_page: 5,
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});

describe("AbilityLoader", () => {
  let client: WordPressClient;

  beforeAll(async () => {
    logger.setDebug(process.env.DEBUG === "true");
    client = new WordPressClient(TEST_URL, TEST_USER, TEST_PASS);
    await client.initialize();
  });

  it("should load all abilities", async () => {
    const abilities = await loadAbilities(client, []);
    expect(abilities.length).toBeGreaterThan(20);
    expect(abilities[0].mcpName).toMatch(/^wordpress\//);
    expect(abilities[0].inputSchema).toBeDefined();
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
});
