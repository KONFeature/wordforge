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

export interface Session {
  id: string;
  title: string;
  time: {
    created: number;
    updated: number;
  };
}

export interface MessageInfo {
  id: string;
  role: 'user' | 'assistant';
  time: {
    created: number;
    updated?: number;
  };
  error?: {
    code: string;
    message: string;
    data?: any;
  };
  sessionID: string;
}

export interface ToolCallState {
  status: 'pending' | 'running' | 'completed' | 'error';
  title?: string;
  input?: any;
  output?: any;
  error?: string;
}

export interface MessagePart {
  id: string;
  type: 'text' | 'tool';
  text?: string;
  tool?: string;
  state?: ToolCallState;
  messageID: string;
  sessionID: string;
}

export interface Message {
  info: MessageInfo;
  parts: MessagePart[];
}

export interface SessionStatus {
  type: 'idle' | 'busy' | 'retry';
  details?: string;
}

export interface SSEEvent {
  type: string;
  properties: any;
}

declare global {
  interface Window {
    wordforgeChat?: WordForgeChatConfig;
    wordforgeSettings?: WordForgeSettingsConfig;
  }
}

export {};
