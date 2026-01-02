#!/usr/bin/env node

import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { AbilitiesApiClient } from './abilities-client.js';
import { type LoadedAbility, loadAbilities } from './ability-loader.js';
import * as logger from './logger.js';
import type { Config } from './types.js';

function getConfig(): Config {
  const url = process.env.WORDPRESS_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_APP_PASSWORD;

  if (!url || !username || !password) {
    logger.fatalError('Missing required environment variables', {
      WORDPRESS_URL: url ? 'set' : 'MISSING',
      WORDPRESS_USERNAME: username ? 'set' : 'MISSING',
      WORDPRESS_APP_PASSWORD: password ? 'set' : 'MISSING',
    });
  }

  const excludeCategories = (process.env.WORDFORGE_EXCLUDE_CATEGORIES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const debug = process.env.WORDFORGE_DEBUG === 'true';

  return { url, username, password, excludeCategories, debug };
}

function registerTool(
  server: McpServer,
  ability: LoadedAbility,
  client: AbilitiesApiClient,
): void {
  server.registerTool(
    ability.mcpName,
    {
      title: ability.label,
      description: ability.description,
      inputSchema: ability.inputSchema,
      outputSchema: ability.outputSchema,
      annotations: ability.annotations,
    },
    async (args) => {
      try {
        const result = await client.executeAbility(
          ability.name,
          ability.httpMethod,
          args,
        );

        // When outputSchema is defined, MCP requires structuredContent
        if (ability.outputSchema) {
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(result, null, 2) },
            ],
            structuredContent: result as Record<string, unknown>,
          };
        }

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Tool ${ability.mcpName} failed`, err);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ error: message }) },
          ],
          isError: true,
        };
      }
    },
  );
}

function registerPrompt(
  server: McpServer,
  ability: LoadedAbility,
  client: AbilitiesApiClient,
): void {
  server.registerPrompt(
    ability.mcpName,
    {
      title: ability.label,
      description: ability.description,
      argsSchema: ability.inputSchema as unknown as ZodRawShapeCompat,
    },
    async (args) => {
      try {
        const result = await client.executeAbility(
          ability.name,
          ability.httpMethod,
          args,
        );

        if (
          result &&
          typeof result === 'object' &&
          'messages' in result &&
          Array.isArray(result.messages)
        ) {
          return { messages: result.messages };
        }

        return {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Prompt ${ability.mcpName} failed`, err);
        return {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `Error: ${message}`,
              },
            },
          ],
        };
      }
    },
  );
}

function registerResource(
  server: McpServer,
  ability: LoadedAbility,
  client: AbilitiesApiClient,
): void {
  const resourceUri = `wordpress://${ability.name.replace('wordforge/', '')}`;

  server.registerResource(
    ability.mcpName,
    new ResourceTemplate(resourceUri, { list: undefined }),
    {
      title: ability.label,
      description: ability.description,
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const result = await client.executeAbility(
          ability.name,
          ability.httpMethod,
          {},
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Resource ${ability.mcpName} failed`, err);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: message }),
            },
          ],
        };
      }
    },
  );
}

async function main(): Promise<void> {
  const config = getConfig();
  logger.setDebug(config.debug);

  logger.info('Starting WordForge Claude Extension');
  logger.debug('Configuration', {
    url: config.url,
    username: config.username,
    excludeCategories: config.excludeCategories,
  });

  const client = new AbilitiesApiClient(
    config.url,
    config.username,
    config.password,
  );

  const abilities = await loadAbilities(client, config.excludeCategories);

  const server = new McpServer({
    name: 'wordforge',
    version: '1.1.0',
    websiteUrl: 'https://github.com/KONFeature/wordforge',
  });

  let toolCount = 0;
  let promptCount = 0;
  let resourceCount = 0;

  for (const ability of abilities) {
    switch (ability.mcpType) {
      case 'tool':
        registerTool(server, ability, client);
        toolCount++;
        logger.debug(`Registered tool: ${ability.mcpName}`);
        break;
      case 'prompt':
        registerPrompt(server, ability, client);
        promptCount++;
        logger.debug(`Registered prompt: ${ability.mcpName}`);
        break;
      case 'resource':
        registerResource(server, ability, client);
        resourceCount++;
        logger.debug(`Registered resource: ${ability.mcpName}`);
        break;
    }
  }

  logger.info(
    `Registered ${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources`,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('WordForge MCP server running');
}

main().catch((err) => {
  logger.error('Fatal error during startup', err);
  process.exit(1);
});
