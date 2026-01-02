import type {
  AgentPart,
  AssistantMessage,
  CompactionPart,
  FilePart,
  Message,
  Part,
  PatchPart,
  ReasoningPart,
  RetryPart,
  StepFinishPart,
  StepStartPart,
  TextPart,
  ToolPart,
  UserMessage,
} from '@opencode-ai/sdk/client';

export type {
  AgentPart,
  CompactionPart,
  FilePart,
  Part,
  PatchPart,
  ReasoningPart,
  RetryPart,
  StepFinishPart,
  StepStartPart,
  TextPart,
  ToolPart,
};

export interface SubtaskPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'subtask';
  prompt: string;
  description: string;
  agent: string;
}

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

export const isFilePart = (part: Part): part is FilePart =>
  part.type === 'file';

export const isStepStartPart = (part: Part): part is StepStartPart =>
  part.type === 'step-start';

export const isStepFinishPart = (part: Part): part is StepFinishPart =>
  part.type === 'step-finish';

export const isPatchPart = (part: Part): part is PatchPart =>
  part.type === 'patch';

export const isAgentPart = (part: Part): part is AgentPart =>
  part.type === 'agent';

export const isRetryPart = (part: Part): part is RetryPart =>
  part.type === 'retry';

export const isCompactionPart = (part: Part): part is CompactionPart =>
  part.type === 'compaction';

export const isSubtaskPart = (part: Part): part is SubtaskPart =>
  part.type === 'subtask';

export const isTaskTool = (part: ToolPart): boolean => part.tool === 'task';

export const getTaskSessionId = (part: ToolPart): string | undefined => {
  const state = part.state;
  if ('metadata' in state && state.metadata) {
    return state.metadata.sessionId as string | undefined;
  }
  return undefined;
};
