export interface Config {
  url: string;
  username: string;
  password: string;
  excludeCategories: string[];
  debug: boolean;
}

export interface AbilitySummary {
  name: string;
  label: string;
  description: string;
}

export interface AbilitySchema {
  name: string;
  label: string;
  description: string;
  input_schema: JsonSchema;
  output_schema: JsonSchema;
  meta: {
    annotations: {
      readonly?: boolean;
      destructive?: boolean;
      idempotent?: boolean;
    };
    mcp: {
      public: boolean;
      type: string;
    };
  };
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type: string | string[];
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
}

export interface McpRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface McpResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface ToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface InitializeResult {
  protocolVersion: string;
  serverInfo: {
    name: string;
    version: string;
  };
  capabilities: Record<string, unknown>;
}

export interface DiscoverAbilitiesResult {
  abilities: AbilitySummary[];
}

export interface AbilityExecutionResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
