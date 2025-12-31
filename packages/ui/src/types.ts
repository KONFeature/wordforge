export type {
  Session,
  Message,
  Part,
  TextPart,
  ToolPart,
  ToolState,
  SessionStatus,
  Event,
} from '@opencode-ai/sdk/client';

export interface WordForgeChatConfig {
  proxyUrl: string;
  nonce: string;
  i18n: {
    newSession: string;
    untitled: string;
    selectSession: string;
    noMessages: string;
    previousMessages: string;
    you: string;
    assistant: string;
    sending: string;
    thinking: string;
    error: string;
    retry: string;
    idle: string;
    busy: string;
    tool: string;
    pending: string;
    running: string;
    completed: string;
    failed: string;
    noSessions: string;
    loadError: string;
    createError: string;
    deleteError: string;
    sendError: string;
    connectionError: string;
    [key: string]: string;
  };
}

export interface WordForgeSettingsConfig {
  restUrl: string;
  nonce: string;
  optionsNonce: string;
  settings: {
    pluginVersion: string;
    binaryInstalled: boolean;
    serverRunning: boolean;
    serverPort: number | null;
    mcpEnabled: boolean;
    mcpNamespace: string;
    mcpRoute: string;
    mcpEndpoint: string;
    serverId: string;
    platformInfo: {
      os: string;
      arch: string;
      binary_name: string;
      is_installed: boolean;
      install_path: string;
      version?: string;
    };
  };
  abilities: Record<string, Array<{ name: string; description: string }>>;
  integrations: {
    woocommerce: boolean;
    mcpAdapter: boolean;
  };
  i18n: Record<string, string>;
}

export interface ChatMessage {
  info: Message;
  parts: Part[];
}

declare global {
  interface Window {
    wordforgeChat?: WordForgeChatConfig;
    wordforgeSettings?: WordForgeSettingsConfig;
  }
}

export {};
