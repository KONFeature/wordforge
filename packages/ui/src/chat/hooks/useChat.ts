import type { Provider, Session, SessionStatus } from '@opencode-ai/sdk/client';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
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
import { findParentSession } from './useSessionHierarchy';
import {
  useDeleteSession,
  useSessionStatuses,
  useSessions,
} from './useSessions';

export interface ChatState {
  sessionId: string | null;
  session: Session | undefined;
  parentSession: Session | null;
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

export const useChat = (options: UseChatOptions = {}): ChatState => {
  const { context = null, initialSessionId = null } = options;

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [model, setModel] = useState<SelectedModel | null>(null);

  const { data: sessions = [], isLoading: isLoadingSessions } = useSessions();
  const { data: statuses = {}, refetch: refetchStatus } = useSessionStatuses();
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useMessages(sessionId);
  const { data: configData } = useProvidersConfig();

  const { data: serverStatus } = useServerStatus();
  const autoStart = useAutoStartServer();

  const sendMessage = useSendMessage();
  const abortSession = useAbortSession();
  const deleteSessionMutation = useDeleteSession();

  useEffect(() => {
    if (configData?.defaultModel && !model) {
      setModel(configData.defaultModel);
    }
  }, [configData?.defaultModel, model]);

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId],
  );

  const parentSession = useMemo(
    () => findParentSession(sessions, sessionId),
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

  const abort = useCallback(() => {
    if (sessionId) {
      abortSession.mutate(sessionId);
    }
  }, [sessionId]);

  const deleteSession = useCallback(async () => {
    if (!sessionId) return;
    await deleteSessionMutation.mutateAsync(sessionId);
    setSessionId(null);
  }, [sessionId]);

  const selectSession = (id: string | null) => {
    setSessionId(id);
  };

  const startServer = () => {
    autoStart.mutate();
  };

  const refresh = useCallback(() => {
    refetchMessages();
    refetchStatus();
  }, []);

  const resetError = () => {
    sendMessage.reset();
    deleteSessionMutation.reset();
    autoStart.reset();
  };

  return {
    sessionId,
    session,
    parentSession,
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
