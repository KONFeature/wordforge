import type {
  OpencodeClient,
  Provider,
  Session,
  SessionStatus,
} from '@opencode-ai/sdk/client';
import { useEffect, useMemo, useState } from '@wordpress/element';
import type { ChatMessage } from '../components/MessageList';
import type { SelectedModel } from '../components/ModelSelector';
import { useProvidersConfig } from './useConfig';
import type { ScopedContext } from './useContextInjection';
import {
  type SendMessageResult,
  useAbortSession,
  useMessages,
  useSendMessage,
} from './useMessages';
import {
  type ServerStatus,
  useAutoStartServer,
  useServerStatus,
} from './useServerStatus';
import {
  useDeleteSession,
  useSessionStatuses,
  useSessions,
} from './useSessions';

export interface ChatState {
  sessionId: string | null;
  session: Session | undefined;
  sessions: Session[];
  statuses: Record<string, SessionStatus>;
  isLoadingSessions: boolean;

  messages: ChatMessage[];
  isLoadingMessages: boolean;

  model: SelectedModel | null;
  setModel: (model: SelectedModel | null) => void;
  providers: Provider[];

  serverStatus: ServerStatus | undefined;
  isServerReady: boolean;

  isBusy: boolean;
  isSending: boolean;
  isDeleting: boolean;
  isStartingServer: boolean;
  error: Error | null;
  serverError: string | null;

  send: (text: string) => Promise<SendMessageResult>;
  abort: () => void;
  deleteSession: () => Promise<void>;
  selectSession: (id: string | null) => void;
  startServer: () => void;
  refresh: () => void;
  resetError: () => void;
}

interface UseChatOptions {
  context?: ScopedContext | null;
  initialSessionId?: string | null;
}

export const useChat = (
  client: OpencodeClient | null,
  options: UseChatOptions = {},
): ChatState => {
  const { context = null, initialSessionId = null } = options;

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [model, setModel] = useState<SelectedModel | null>(null);

  const { data: sessions = [], isLoading: isLoadingSessions } =
    useSessions(client);
  const { data: statuses = {} } = useSessionStatuses(client);
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useMessages(client, sessionId);
  const { data: configData } = useProvidersConfig(client);

  const { data: serverStatus } = useServerStatus();
  const autoStart = useAutoStartServer();

  const sendMessage = useSendMessage(client);
  const abortSession = useAbortSession(client);
  const deleteSessionMutation = useDeleteSession(client);

  useEffect(() => {
    if (configData?.defaultModel && !model) {
      setModel(configData.defaultModel);
    }
  }, [configData?.defaultModel, model]);

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId],
  );

  const currentStatus = sessionId
    ? (statuses[sessionId]?.type ?? 'idle')
    : 'idle';
  const isBusy =
    currentStatus === 'busy' ||
    currentStatus === 'retry' ||
    sendMessage.isPending;

  const isServerReady = serverStatus?.running ?? false;

  const error = sendMessage.error ?? deleteSessionMutation.error ?? null;

  const serverError =
    autoStart.error instanceof Error ? autoStart.error.message : null;

  const send = async (text: string): Promise<SendMessageResult> =>
    await sendMessage.mutateAsync(
      {
        text,
        sessionId: sessionId ?? undefined,
        model: model ?? undefined,
        context,
        messages,
      },
      {
        onSuccess: (result) => {
          if (result.isNewSession) setSessionId(result.sessionId);
        },
      },
    );

  const abort = () => {
    if (sessionId) {
      abortSession.mutate(sessionId);
    }
  };

  const deleteSession = async () => {
    if (!sessionId) return;
    await deleteSessionMutation.mutateAsync(sessionId);
    setSessionId(null);
  };

  const selectSession = (id: string | null) => {
    setSessionId(id);
  };

  const startServer = () => {
    autoStart.mutate();
  };

  const refresh = () => {
    refetchMessages();
  };

  const resetError = () => {
    sendMessage.reset();
    deleteSessionMutation.reset();
    autoStart.reset();
  };

  return {
    sessionId,
    session,
    sessions,
    statuses,
    isLoadingSessions,

    messages,
    isLoadingMessages,

    model,
    setModel,
    providers: configData?.providers ?? [],

    serverStatus,
    isServerReady,

    isBusy,
    isSending: sendMessage.isPending,
    isDeleting: deleteSessionMutation.isPending,
    isStartingServer: autoStart.isPending,
    error:
      error instanceof Error ? error : error ? new Error(String(error)) : null,
    serverError,

    send,
    abort,
    deleteSession,
    selectSession,
    startServer,
    refresh,
    resetError,
  };
};
