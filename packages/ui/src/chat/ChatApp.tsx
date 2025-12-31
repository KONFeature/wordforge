import { Button, Notice } from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './ChatApp.module.css';
import { ConfigPanel } from './components/ConfigPanel';
import { DeleteSessionModal } from './components/DeleteSessionModal';
import { InputArea } from './components/InputArea';
import { MessageList } from './components/MessageList';
import type { SelectedModel } from './components/ModelSelector';
import { SessionList } from './components/SessionList';
import { useMcpStatus, useProvidersConfig } from './hooks/useConfig';
import {
  useAbortSession,
  useMessages,
  useSendMessage,
} from './hooks/useMessages';
import {
  useCreateSession,
  useDeleteSession,
  useSessionStatuses,
  useSessions,
} from './hooks/useSessions';
import { useOpencodeClient } from './useOpencodeClient';

export const ChatApp = () => {
  const config = window.wordforgeChat;
  const client = config ? useOpencodeClient(config) : null;

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(
    null,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

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
    setShowDeleteModal(false);
  };

  const handleSendMessage = (text: string) => {
    if (!currentSessionId) return;
    sendMessage.mutate({
      text,
      sessionId: currentSessionId,
      model: selectedModel ?? undefined,
    });
  };

  const handleAbort = () => {
    if (!currentSessionId) return;
    abortSession.mutate(currentSessionId);
  };

  if (!config) {
    return (
      <div className={styles.configMissing}>
        WordForge Configuration Missing
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <SessionList
          sessions={sessions}
          statuses={statuses}
          currentSessionId={currentSessionId}
          isLoading={isLoadingSessions}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          isCreating={createSession.isPending}
        />

        <div className={styles.main}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <span className={styles.sessionTitle}>
                {currentSession?.title || __('Select a session', 'wordforge')}
              </span>
              {currentSessionId && (
                <span
                  className={`${styles.statusBadge} ${isBusy ? styles.busy : styles.ready}`}
                >
                  {isBusy ? __('Busy', 'wordforge') : __('Ready', 'wordforge')}
                </span>
              )}
            </div>
            <div className={styles.headerActions}>
              <Button
                icon="update"
                label={__('Refresh', 'wordforge')}
                onClick={() => refetchMessages()}
                disabled={!currentSessionId}
                isSmall
              />
              <Button
                icon="trash"
                label={__('Delete Session', 'wordforge')}
                onClick={() => setShowDeleteModal(true)}
                disabled={!currentSessionId}
                isSmall
                isDestructive
              />
            </div>
          </div>

          <MessageList
            messages={messages}
            isLoading={isLoadingMessages}
            isThinking={isBusy}
            isBusy={isBusy}
          />

          {errorMessage && (
            <div className={styles.errorContainer}>
              <Notice
                status="error"
                onRemove={() => {
                  createSession.reset();
                  deleteSession.reset();
                  sendMessage.reset();
                }}
                isDismissible
              >
                {errorMessage}
              </Notice>
            </div>
          )}

          <InputArea
            onSend={handleSendMessage}
            onAbort={handleAbort}
            disabled={!currentSessionId}
            isBusy={isBusy}
            providers={configData?.providers ?? []}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
          />
        </div>

        <DeleteSessionModal
          sessionName={
            currentSession?.title || __('Untitled Session', 'wordforge')
          }
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSession}
          isDeleting={deleteSession.isPending}
        />
      </div>

      <ConfigPanel
        providers={configData?.providers ?? []}
        mcpStatus={mcpStatus}
        isLoading={isLoadingConfig}
      />
    </div>
  );
};
