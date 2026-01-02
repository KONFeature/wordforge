import type { ConnectionMode } from './openCodeClient';

export const queryKeys = {
  sessions: (mode: ConnectionMode) => [mode, 'sessions'] as const,
  statuses: (mode: ConnectionMode) => [mode, 'session-statuses'] as const,
  messages: (mode: ConnectionMode, sessionId: string) =>
    [mode, 'messages', sessionId] as const,
  config: (mode: ConnectionMode) => [mode, 'config'] as const,
  mcpStatus: (mode: ConnectionMode) => [mode, 'mcp-status'] as const,
  agentConfigs: (mode: ConnectionMode) => [mode, 'agents'] as const,
};
