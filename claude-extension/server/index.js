#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const WORDPRESS_MCP_URL = process.env.WORDPRESS_MCP_URL;
const WORDPRESS_USERNAME = process.env.WORDPRESS_USERNAME;
const WORDPRESS_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

if (!WORDPRESS_MCP_URL || !WORDPRESS_USERNAME || !WORDPRESS_APP_PASSWORD) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${WORDPRESS_USERNAME}:${WORDPRESS_APP_PASSWORD}`).toString("base64")}`;

async function sendMcpRequest(method, params = {}) {
  const response = await fetch(WORDPRESS_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.error.message || "Unknown MCP error");
  }

  return result.result;
}

const server = new Server(
  {
    name: "wordforge",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

let cachedTools = null;
let cachedPrompts = null;

async function getTools() {
  if (!cachedTools) {
    try {
      const result = await sendMcpRequest("tools/list");
      cachedTools = result.tools || [];
    } catch (error) {
      console.error("Failed to fetch tools:", error.message);
      cachedTools = [];
    }
  }
  return cachedTools;
}

async function getPrompts() {
  if (!cachedPrompts) {
    try {
      const result = await sendMcpRequest("prompts/list");
      cachedPrompts = result.prompts || [];
    } catch (error) {
      console.error("Failed to fetch prompts:", error.message);
      cachedPrompts = [];
    }
  }
  return cachedPrompts;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await getTools();
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await sendMcpRequest("tools/call", {
      name,
      arguments: args || {},
    });
    
    return {
      content: result.content || [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: result.isError || false,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  const prompts = await getPrompts();
  return { prompts };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await sendMcpRequest("prompts/get", {
      name,
      arguments: args || {},
    });
    
    return result;
  } catch (error) {
    return {
      messages: [
        {
          role: "user",
          content: { type: "text", text: `Error fetching prompt: ${error.message}` },
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("WordForge MCP proxy server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
