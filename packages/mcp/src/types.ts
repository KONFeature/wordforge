import type { ZodTypeAny } from 'zod';

export interface Config {
  /** WordPress Abilities REST API base URL (e.g., https://example.com/wp-json/wp-abilities/v1) */
  url: string;
  username: string;
  password: string;
  excludeCategories: string[];
  debug: boolean;
}

/**
 * JSON Schema type definitions.
 */
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchema;
  format?: string;
}

/**
 * Ability from the WordPress Abilities REST API.
 * GET /wp-abilities/v1/abilities
 */
export interface Ability {
  name: string;
  label: string;
  description: string;
  category: string;
  input_schema?: JsonSchema;
  output_schema: JsonSchema;
  meta: {
    show_in_rest?: boolean;
    mcp?: {
      public: boolean;
      type: 'tool' | 'prompt' | 'resource';
    };
    annotations?: {
      instructions?: string;
      readonly?: boolean;
      destructive?: boolean;
      idempotent?: boolean;
      audience?: string[];
      priority?: number;
    };
  };
}

/**
 * Category from the WordPress Abilities REST API.
 * GET /wp-abilities/v1/categories
 */
export interface Category {
  slug: string;
  label: string;
  description: string;
  meta?: Record<string, unknown>;
}

/**
 * WordPress REST API error response.
 */
export interface WPError {
  code: string;
  message: string;
  data?: {
    status?: number;
  };
}

/**
 * HTTP method to use for ability execution based on annotations.
 */
export type HttpMethod = 'GET' | 'POST';

export interface LoadedAbility {
  name: string;
  mcpName: string;
  label: string;
  description: string;
  category: string;
  inputSchema: ZodTypeAny;
  outputSchema?: ZodTypeAny;
  mcpType: 'tool' | 'prompt' | 'resource';
  httpMethod: HttpMethod;
  annotations: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}
