#!/usr/bin/env node

import * as readline from "readline";

const url = process.env.WORDPRESS_MCP_URL;
const username = process.env.WORDPRESS_USERNAME;
const password = process.env.WORDPRESS_APP_PASSWORD;

if (!url || !username || !password) {
  console.error("Missing required environment variables: WORDPRESS_MCP_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD");
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
let sessionId: string | null = null;
let pendingRequests = 0;
let inputClosed = false;

function checkExit() {
  if (inputClosed && pendingRequests === 0) {
    process.exit(0);
  }
}

async function handleRequest(line: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": auth,
  };

  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: line,
    });

    const newSessionId = res.headers.get("Mcp-Session-Id");
    if (newSessionId) {
      sessionId = newSessionId;
    }

    const text = await res.text();
    console.log(text);
  } catch (err) {
    const errorResponse = {
      jsonrpc: "2.0",
      error: { code: -32000, message: err instanceof Error ? err.message : String(err) },
      id: null,
    };
    console.log(JSON.stringify(errorResponse));
  }

  pendingRequests--;
  checkExit();
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on("line", (line) => {
  if (!line.trim()) return;
  pendingRequests++;
  handleRequest(line);
});

rl.on("close", () => {
  inputClosed = true;
  checkExit();
});
