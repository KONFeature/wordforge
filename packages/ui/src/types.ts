import type { Message, Part } from '@opencode-ai/sdk';

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
  restUrl?: string;
  siteUrl?: string;
  nonce: string;
  localServerPort?: number;
  localServerEnabled?: boolean;
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
export interface WordForgeEditorConfig {
  proxyUrl: string;
  restUrl?: string;
  siteUrl?: string;
  nonce: string;
  localServerPort?: number;
  localServerEnabled?: boolean;
}

export interface WordForgeWidgetConfig {
  proxyUrl: string;
  restUrl?: string;
  siteUrl?: string;
  nonce: string;
  localServerPort?: number;
  localServerEnabled?: boolean;
  context?: {
    type: string;
    postType?: string;
    postId?: number;
  };
}

export interface ConfiguredProvider {
  configured: boolean;
  api_key_masked: string | null;
}

export interface ProviderDisplayInfo {
  id: string;
  name: string;
  configured: boolean;
  apiKeyMasked: string | null;
  helpUrl: string;
  helpText: string;
  placeholder: string;
  hasFreeModels: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  currentModel: string | null;
  effectiveModel: string;
  recommendedModel: string;
  recommendations: string[];
}

export interface ActivityStatus {
  last_activity: number | null;
  seconds_inactive: number | null;
  threshold: number;
  is_inactive: boolean;
  auto_shutdown_enabled: boolean;
  will_shutdown_in: number | null;
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
    autoShutdownEnabled: boolean;
    autoShutdownThreshold: number;
    execEnabled: boolean;
    localServerPort: number;
    localServerEnabled: boolean;
    platformInfo: {
      os: string;
      arch: string;
      binary_name: string;
      is_installed: boolean;
      version?: string;
    };
  };
  abilities: Record<string, Array<{ name: string; description: string }>>;
  configuredProviders: Record<string, ConfiguredProvider>;
  agents: AgentInfo[];
  activity: ActivityStatus;
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
    wordforgeEditor?: WordForgeEditorConfig;
    wordforgeWidget?: WordForgeWidgetConfig;
    wordforgeSettings?: WordForgeSettingsConfig;
  }
}
