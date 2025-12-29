#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WordPressClient } from "./wordpress-client.js";
import { loadAbilities, type LoadedAbility } from "./ability-loader.js";
import * as logger from "./logger.js";
import type { Config } from "./types.js";

function getConfig(): Config {
  const url = process.env.WORDPRESS_MCP_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_APP_PASSWORD;

  if (!url || !username || !password) {
    logger.fatalError("Missing required environment variables", {
      WORDPRESS_MCP_URL: url ? "set" : "MISSING",
      WORDPRESS_USERNAME: username ? "set" : "MISSING",
      WORDPRESS_APP_PASSWORD: password ? "set" : "MISSING",
    });
  }

  const excludeCategories = (process.env.WORDFORGE_EXCLUDE_CATEGORIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const debug = process.env.WORDFORGE_DEBUG === "true";

  return { url, username, password, excludeCategories, debug };
}

function registerTool(
  server: McpServer,
  ability: LoadedAbility,
  client: WordPressClient
): void {
  server.registerTool(
    ability.mcpName,
    {
      title: ability.label,
      description: ability.description,
      inputSchema: ability.inputSchema,
      outputSchema: ability.outputSchema,
      annotations: ability.annotations
    },
    async (args) => {
      try {
        const result = await client.executeAbility(ability.name, args);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Tool ${ability.mcpName} failed`, err);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );
}

async function main(): Promise<void> {
  const config = getConfig();
  logger.setDebug(config.debug);

  logger.info("Starting WordForge Claude Extension");
  logger.debug("Configuration", {
    url: config.url,
    username: config.username,
    excludeCategories: config.excludeCategories,
  });

  const client = new WordPressClient(config.url, config.username, config.password);
  await client.initialize();

  const abilities = await loadAbilities(client, config.excludeCategories);

  const server = new McpServer({
    name: "wordforge",
    version: "1.0.0",
  });

  for (const ability of abilities) {
    registerTool(server, ability, client);
    logger.debug(`Registered tool: ${ability.mcpName}`);
  }

  logger.info(`Registered ${abilities.length} tools`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("WordForge MCP server running");
}

main().catch((err) => {
  logger.error("Fatal error during startup", err);
  process.exit(1);
});
