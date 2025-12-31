import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { useEffect, useMemo, useState } from '@wordpress/element';
import type { SelectedModel } from '../components/ModelSelector';
import { useMcpStatus, useProvidersConfig } from './useConfig';
import { useAbortSession, useMessages, useSendMessage } from './useMessages';
import {
  useCreateSession,
  useDeleteSession,
  useSessionStatuses,
  useSessions,
} from './useSessions';

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
  handleCreateSession: () => Promise<void>;
  handleDeleteSession: () => Promise<void>;
  handleSendMessage: (text: string) => void;
  handleAbort: () => void;
  resetErrors: () => void;

  isCreatingSession: boolean;
  isDeletingSession: boolean;
  isSendingMessage: boolean;
}

export const useChatCore = (client: OpencodeClient | null): ChatCoreState => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(
    null,
  );

  const { data: sessions = [], isLoading: isLoadingSessions } =
    useSessions(client);
  const { data: statuses = {} } = useSessionStatuses(client);
  const { data: messages = [], isLoading: isLoadingMessages } = useMessages(
    client,
    currentSessionId,
  );
  const { data: configData, isLoading: isLoadingConfig } =
    useProvidersConfig(client);
  const { data: mcpStatus = {} } = useMcpStatus(client);

  const createSession = useCreateSession(client);
  const deleteSession = useDeleteSession(client);
  const sendMessage = useSendMessage(client, currentSessionId);
  const abortSession = useAbortSession(client, currentSessionId);

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

  const handleCreateSession = async () => {
    const newSession = await createSession.mutateAsync();
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = async () => {
    if (!currentSessionId) return;
    await deleteSession.mutateAsync(currentSessionId);
    setCurrentSessionId(null);
  };

  const handleSendMessage = (text: string) => {
    sendMessage.mutate({ text, model: selectedModel ?? undefined });
  };

  const handleAbort = () => {
    abortSession.mutate();
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
