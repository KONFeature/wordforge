import type {
  AssistantMessage,
  Message,
  Part,
  ReasoningPart,
  TextPart,
  ToolPart,
  UserMessage,
} from '@opencode-ai/sdk/client';

export type { Part, ReasoningPart, TextPart, ToolPart };

export interface ChatMessage {
  info: Message;
  parts: Part[];
}

export interface MessageTurn {
  userMessage: ChatMessage;
  assistantMessages: ChatMessage[];
  isComplete: boolean;
}

export const isUserMessage = (msg: Message): msg is UserMessage =>
  msg.role === 'user';

export const isAssistantMessage = (msg: Message): msg is AssistantMessage =>
  msg.role === 'assistant';

export const isTextPart = (part: Part): part is TextPart =>
  part.type === 'text';

export const isToolPart = (part: Part): part is ToolPart =>
  part.type === 'tool';

export const isReasoningPart = (part: Part): part is ReasoningPart =>
  part.type === 'reasoning';

export const isTaskTool = (part: ToolPart): boolean => part.tool === 'task';

export const getTaskSessionId = (part: ToolPart): string | undefined => {
  const state = part.state;
  if ('metadata' in state && state.metadata) {
    return state.metadata.sessionId as string | undefined;
  }
  return undefined;
};
