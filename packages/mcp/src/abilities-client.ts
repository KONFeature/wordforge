import * as logger from "./logger.js";
import type { Ability, Category, WPError, HttpMethod } from "./types.js";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1_000;

export class AbilitiesApiClient {
  private baseUrl: string;
  private auth: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  async listAbilities(): Promise<Ability[]> {
    logger.debug("Fetching all abilities");
    const abilities = await this.get<Ability[]>("/abilities?per_page=100");
    logger.info(`Fetched ${abilities.length} abilities`);
    return abilities;
  }

  async listCategories(): Promise<Category[]> {
    logger.debug("Fetching all categories");
    const categories = await this.get<Category[]>("/categories?per_page=100");
    logger.info(`Fetched ${categories.length} categories`);
    return categories;
  }

  async getAbility(name: string): Promise<Ability> {
    const path = `/abilities/${name}`;
    logger.debug(`Fetching ability: ${name}`);
    return this.get<Ability>(path);
  }

  async executeAbility(
    name: string,
    method: HttpMethod,
    input?: unknown
  ): Promise<unknown> {
    const path = `/abilities/${name}/run`;
    logger.debug(`Executing ability: ${name} [${method}]`, input);

    switch (method) {
      case "GET": {
        const query = input ? `?${this.serializeInput(input)}` : "";
        return this.get(path + query);
      }
      case "POST":
        return this.post(path, input ? { input } : undefined);
      case "DELETE": {
        const query = input ? `?${this.serializeInput(input)}` : "";
        return this.delete(path + query);
      }
    }
  }

  /**
   * Serialize input object as PHP-style query params: input[key]=value
   * WordPress REST API expects this format for GET/DELETE requests.
   */
  private serializeInput(input: unknown, prefix = "input"): string {
    if (input === null || input === undefined) {
      return "";
    }

    const params: string[] = [];

    if (typeof input === "object" && !Array.isArray(input)) {
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        const paramKey = `${prefix}[${key}]`;
        if (typeof value === "object" && value !== null) {
          params.push(this.serializeInput(value, paramKey));
        } else {
          params.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(value))}`);
        }
      }
    } else if (Array.isArray(input)) {
      input.forEach((item, index) => {
        const paramKey = `${prefix}[${index}]`;
        if (typeof item === "object" && item !== null) {
          params.push(this.serializeInput(item, paramKey));
        } else {
          params.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else {
      params.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(input))}`);
    }

    return params.filter(Boolean).join("&");
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.doRequest<T>(method, path, body);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logger.connectionError(this.baseUrl, attempt, MAX_RETRIES, err, delay);
          await this.sleep(delay);
        } else {
          logger.connectionError(this.baseUrl, attempt, MAX_RETRIES, err);
        }
      }
    }

    throw lastError ?? new Error("Request failed after all retries");
  }

  private async doRequest<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.auth,
      Accept: "application/json",
    };

    const options: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    logger.debug(`${method} ${path}`, body);

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const wpError = data as WPError;
      throw new Error(
        `${wpError.code}: ${wpError.message} (HTTP ${response.status}) (${method} ${url})`
      );
    }

    logger.debug(`Response ${path}`, { status: response.status });
    return data as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
