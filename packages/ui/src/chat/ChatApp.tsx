import { Button, Notice } from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
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
    sendMessage.mutate({ text, model: selectedModel ?? undefined });
  };

  const handleAbort = () => {
    abortSession.mutate();
  };

  if (!config) {
    return (
      <div style={{ padding: '20px', color: '#d63638' }}>
        WordForge Configuration Missing
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '500px',
      }}
    >
      <div
        className="wf-chat-container"
        style={{
          display: 'flex',
          flex: 1,
          background: '#fff',
          border: '1px solid #c3c4c7',
          borderRadius: '4px 4px 0 0',
          overflow: 'hidden',
        }}
      >
        <SessionList
          sessions={sessions}
          statuses={statuses}
          currentSessionId={currentSessionId}
          isLoading={isLoadingSessions}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          isCreating={createSession.isPending}
        />

        <div
          className="wf-chat-main"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <div
            className="wf-chat-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #c3c4c7',
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentSession?.title || __('Select a session', 'wordforge')}
              </span>
              {currentSessionId && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isBusy ? '#fff3cd' : '#d4edda',
                    color: isBusy ? '#856404' : '#155724',
                  }}
                >
                  {isBusy ? __('Busy', 'wordforge') : __('Ready', 'wordforge')}
                </span>
              )}
            </div>
            <div className="wf-chat-actions">
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
            <div style={{ padding: '0 16px' }}>
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
