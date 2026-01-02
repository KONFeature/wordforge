import type { ChatMessage } from '@/types';
import type {
  Message,
  Part,
  ToolState,
  ToolStateCompleted,
  ToolStateError,
} from '@opencode-ai/sdk';

const MAX_TOOL_INPUT_SIZE = 5 * 1024;
const MAX_TOOL_OUTPUT_SIZE = 5 * 1024;
const MAX_TEXT_SIZE = 10 * 1024;

function getByteSize(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'string') return value.length;
  try {
    return JSON.stringify(value).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function truncateValue(value: unknown, maxSize: number): string | undefined {
  if (value == null) return undefined;

  if (typeof value === 'string' && value.length > maxSize)
    return value.slice(0, maxSize);

  const size = getByteSize(value);
  if (size <= maxSize) return undefined;

  return `[Truncated: ${Math.round(size / 1024)}KB exceeds ${Math.round(maxSize / 1024)}KB limit]`;
}

function sanitizeToolState(state: ToolState): ToolState | undefined {
  if (!state || typeof state !== 'object') return undefined;

  const sanitized: Record<string, unknown> = {
    status: state.status ?? 'pending',
  };

  if ((state as ToolStateCompleted).title)
    sanitized.title = (state as ToolStateCompleted).title;

  if ((state as ToolStateCompleted).metadata)
    sanitized.metadata = {
      sessionId: (state as ToolStateCompleted).metadata.sessionId,
    };

  if (state.input != null) {
    const { env: _env, ...inputWithoutEnv } = state.input as Record<
      string,
      unknown
    >;
    const truncated = truncateValue(inputWithoutEnv, MAX_TOOL_INPUT_SIZE);
    sanitized.input = truncated ?? inputWithoutEnv;
  }

  if (
    (state as ToolStateCompleted).output != null &&
    state.status === 'completed'
  ) {
    const truncated = truncateValue(state.output, MAX_TOOL_OUTPUT_SIZE);
    sanitized.output = truncated ?? state.output;
  }

  if ((state as ToolStateError).error != null) {
    sanitized.error = (state as ToolStateError).error;
  }

  return sanitized as ToolState;
}

function sanitizePart(part: Part): Record<string, unknown> | null {
  if (!part || typeof part !== 'object') return null;

  const p = part;
  if (!p.type) return null;

  const sanitized: Record<string, unknown> = {
    id: p.id ?? `part-${Date.now()}-${Math.random()}`,
    type: p.type,
  };

  if (p.type === 'text' && typeof p.text === 'string') {
    sanitized.text =
      p.text.length > MAX_TEXT_SIZE
        ? `${p.text.slice(0, MAX_TEXT_SIZE)}... [truncated]`
        : p.text;
  } else if (p.type === 'tool') {
    sanitized.tool = p.tool ?? 'unknown';
    sanitized.state = sanitizeToolState(p.state) ?? { status: 'pending' };
  } else if (p.type === 'reasoning' && typeof p.text === 'string') {
    sanitized.text =
      p.text.length > MAX_TEXT_SIZE
        ? `${p.text.slice(0, MAX_TEXT_SIZE)}... [truncated]`
        : p.text;
  }

  return sanitized;
}

export function sanitizeMessage(
  msg: { info: Message; parts: Part[] },
  index: number,
): ChatMessage | null {
  if (!msg || typeof msg !== 'object') {
    console.warn(
      `[WordForge] Invalid message at index ${index}: not an object`,
    );
    return null;
  }

  const message = msg as Record<string, unknown>;
  const rawInfo = message.info;

  if (!rawInfo || typeof rawInfo !== 'object') {
    console.warn(`[WordForge] Invalid message at index ${index}: missing info`);
    return null;
  }

  const info = rawInfo as Record<string, unknown>;
  if (!info.id || !info.role) {
    console.warn(
      `[WordForge] Invalid message at index ${index}: missing id or role`,
    );
    return null;
  }

  const sanitizedInfo: Record<string, unknown> = {
    id: info.id,
    role: info.role,
    sessionID: info.sessionID,
    time: info.time ?? { created: 0 },
  };

  if (info.role === 'assistant') {
    if (info.parentID) sanitizedInfo.parentID = info.parentID;
    if (info.finish) sanitizedInfo.finish = info.finish;
    if (info.providerID) sanitizedInfo.providerID = info.providerID;
    if (info.modelID) sanitizedInfo.modelID = info.modelID;
    if (info.error) sanitizedInfo.error = info.error;
  }

  const rawParts = Array.isArray(message.parts) ? message.parts : [];
  const sanitizedParts = rawParts
    .map((p) => sanitizePart(p))
    .filter((p): p is NonNullable<typeof p> => p != null);

  return {
    info: sanitizedInfo,
    parts: sanitizedParts,
  } as ChatMessage;
}
