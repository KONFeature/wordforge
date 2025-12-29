import * as logger from "./logger.js";
import type {
  McpResponse,
  InitializeResult,
  DiscoverAbilitiesResult,
  AbilitySchema,
  AbilityExecutionResult,
  ToolCallResult,
} from "./types.js";

const MAX_RETRIES = 3;
const MAX_TOTAL_TIME_MS = 60_000;
const INITIAL_RETRY_DELAY_MS = 1_000;

export class WordPressClient {
  private url: string;
  private auth: string;
  private sessionId: string | null = null;
  private requestId = 0;

  constructor(url: string, username: string, password: string) {
    this.url = url;
    this.auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  async initialize(): Promise<InitializeResult> {
    logger.debug("Initializing WordPress MCP session", { url: this.url });

    const result = await this.request<InitializeResult>("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: {
        name: "wordforge-claude-extension",
        version: "1.0.0",
      },
    });

    logger.info(`Connected to ${result.serverInfo.name} v${result.serverInfo.version}`);
    return result;
  }

  async discoverAbilities(): Promise<DiscoverAbilitiesResult["abilities"]> {
    logger.debug("Discovering WordPress abilities");

    const result = await this.callTool<DiscoverAbilitiesResult>(
      "mcp-adapter-discover-abilities",
      {}
    );

    logger.info(`Discovered ${result.abilities.length} abilities`);
    return result.abilities;
  }

  async getAbilityInfo(abilityName: string): Promise<AbilitySchema> {
    logger.debug(`Fetching schema for ${abilityName}`);

    return this.callTool<AbilitySchema>("mcp-adapter-get-ability-info", {
      ability_name: abilityName,
    });
  }

  async executeAbility(
    abilityName: string,
    parameters: unknown
  ): Promise<AbilityExecutionResult> {
    logger.debug(`Executing ${abilityName}`, parameters);

    return this.callTool<AbilityExecutionResult>("mcp-adapter-execute-ability", {
      ability_name: abilityName,
      parameters,
    });
  }

  private async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const result = await this.request<ToolCallResult>("tools/call", {
      name,
      arguments: args,
    });

    if (!result.content?.[0]?.text) {
      throw new Error(`Empty response from ${name}`);
    }

    return JSON.parse(result.content[0].text) as T;
  }

  private async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= MAX_TOTAL_TIME_MS) {
        break;
      }

      try {
        return await this.doRequest<T>(method, params);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          const remainingTime = MAX_TOTAL_TIME_MS - elapsed;
          const actualDelay = Math.min(delay, remainingTime);

          if (actualDelay > 0) {
            logger.connectionError(this.url, attempt, MAX_RETRIES, err, actualDelay);
            await this.sleep(actualDelay);
          }
        } else {
          logger.connectionError(this.url, attempt, MAX_RETRIES, err);
        }
      }
    }

    logger.fatalError("Failed to connect to WordPress MCP after all retries", {
      url: this.url,
      attempts: MAX_RETRIES,
      totalTimeMs: Date.now() - startTime,
      lastError: lastError?.message ?? "Unknown error",
    });
  }

  private async doRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: this.auth,
    };

    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params,
    });

    logger.debug(`Request: ${method}`, { id: this.requestId, params });

    const response = await fetch(this.url, {
      method: "POST",
      headers,
      body,
    });

    const newSessionId = response.headers.get("Mcp-Session-Id");
    if (newSessionId) {
      this.sessionId = newSessionId;
      logger.debug(`Session ID: ${newSessionId}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status} ${response.statusText}${text ? `: ${text}` : ""}`
      );
    }

    const result: McpResponse<T> = await response.json();

    if (result.error) {
      throw new Error(`MCP Error ${result.error.code}: ${result.error.message}`);
    }

    if (result.result === undefined) {
      throw new Error("Empty result from MCP server");
    }

    logger.debug(`Response: ${method}`, { id: result.id });
    return result.result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
