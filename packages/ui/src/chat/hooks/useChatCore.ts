import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { useEffect, useMemo, useState } from '@wordpress/element';
import type { SelectedModel } from '../components/ModelSelector';
import { useMcpStatus, useProvidersConfig } from './useConfig';
import type { ScopedContext } from './useContextInjection';
import { useAbortSession, useMessages, useSendMessage } from './useMessages';
import {
  useCreateSession,
  useDeleteSession,
  useSessionStatuses,
  useSessions,
} from './useSessions';

export interface Session {
  id: string;
  title?: string;
}

export interface ChatCoreState {
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  sessions: ReturnType<typeof useSessions>['data'];
  statuses: ReturnType<typeof useSessionStatuses>['data'];
  currentSession: ReturnType<typeof useSessions>['data'] extends
    | (infer T)[]
    | undefined
    ? T | undefined
    : never;
  currentStatus: string;
  isLoadingSessions: boolean;

  messages: ReturnType<typeof useMessages>['data'];
  isLoadingMessages: boolean;
  refetchMessages: () => void;

  selectedModel: SelectedModel | null;
  setSelectedModel: (model: SelectedModel | null) => void;

  providers: ReturnType<typeof useProvidersConfig>['data'] extends {
    providers: infer P;
  }
    ? P
    : never;
  mcpStatus: ReturnType<typeof useMcpStatus>['data'];
  isLoadingConfig: boolean;
  defaultModel: SelectedModel | null;

  isBusy: boolean;
  error: Error | null;

  handleSelectSession: (id: string) => void;
  handleCreateSession: () => Promise<Session | null>;
  handleDeleteSession: () => Promise<void>;
  handleSendMessage: (text: string, sessionId?: string) => void;
  handleAbort: () => void;
  resetErrors: () => void;

  isCreatingSession: boolean;
  isDeletingSession: boolean;
  isSendingMessage: boolean;
}

interface UseChatCoreOptions {
  context?: ScopedContext | null;
}

export const useChatCore = (
  client: OpencodeClient | null,
  options: UseChatCoreOptions = {},
): ChatCoreState => {
  const { context = null } = options;
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(
    null,
  );

  const { data: sessions = [], isLoading: isLoadingSessions } =
    useSessions(client);
  const { data: statuses = {} } = useSessionStatuses(client);
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useMessages(client, currentSessionId);
  const { data: configData, isLoading: isLoadingConfig } =
    useProvidersConfig(client);
  const { data: mcpStatus = {} } = useMcpStatus(client);

  const createSession = useCreateSession(client);
  const deleteSession = useDeleteSession(client);
  const sendMessage = useSendMessage(client);
  const abortSession = useAbortSession(client);

  useEffect(() => {
    if (configData?.defaultModel && !selectedModel) {
      setSelectedModel(configData.defaultModel);
    }
  }, [configData?.defaultModel, selectedModel]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentSessionId),
    [sessions, currentSessionId],
  );

  const currentStatus = currentSessionId
    ? statuses[currentSessionId]?.type || 'idle'
    : 'idle';

  const isBusy =
    currentStatus === 'busy' ||
    currentStatus === 'retry' ||
    sendMessage.isPending;

  const error = createSession.error || deleteSession.error || sendMessage.error;

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
  };

  const handleCreateSession = async (): Promise<Session | null> => {
    const newSession = await createSession.mutateAsync();
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const handleDeleteSession = async () => {
    if (!currentSessionId) return;
    await deleteSession.mutateAsync(currentSessionId);
    setCurrentSessionId(null);
  };

  const handleSendMessage = (text: string, targetSessionId?: string) => {
    const sessionId = targetSessionId ?? currentSessionId;
    if (!sessionId) return;

    sendMessage.mutate({
      text,
      sessionId,
      model: selectedModel ?? undefined,
      context,
      messages,
    });
  };

  const handleAbort = () => {
    if (!currentSessionId) return;
    abortSession.mutate(currentSessionId);
  };

  const resetErrors = () => {
    createSession.reset();
    deleteSession.reset();
    sendMessage.reset();
  };

  return {
    currentSessionId,
    setCurrentSessionId,
    sessions,
    statuses,
    currentSession,
    currentStatus,
    isLoadingSessions,

    messages,
    isLoadingMessages,
    refetchMessages,

    selectedModel,
    setSelectedModel,

    providers: configData?.providers ?? [],
    mcpStatus,
    isLoadingConfig,
    defaultModel: configData?.defaultModel ?? null,

    isBusy,
    error:
      error instanceof Error ? error : error ? new Error(String(error)) : null,

    handleSelectSession,
    handleCreateSession,
    handleDeleteSession,
    handleSendMessage,
    handleAbort,
    resetErrors,

    isCreatingSession: createSession.isPending,
    isDeletingSession: deleteSession.isPending,
    isSendingMessage: sendMessage.isPending,
  };
};
