import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './ChatApp.module.css';
import { ChatHeader } from './components/ChatHeader';
import { ChatInterface } from './components/ChatInterface';
import { ConfigPanel } from './components/ConfigPanel';
import { DeleteSessionModal } from './components/DeleteSessionModal';
import { SessionList } from './components/SessionList';
import { useChat } from './hooks/useChat';
import { useMcpStatus } from './hooks/useConfig';

export const ChatApp = () => {
  const chat = useChat();
  const { data: mcpStatus = {} } = useMcpStatus();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteSession = async () => {
    await chat.deleteSession();
    setShowDeleteModal(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <SessionList
          sessions={chat.sessions}
          statuses={chat.statuses}
          currentSessionId={chat.sessionId}
          isLoading={chat.isLoadingSessions}
          onSelectSession={chat.selectSession}
          onCreateSession={() => chat.selectSession(null)}
          isCreating={chat.isSending}
        />

        <div className={styles.main}>
          <ChatHeader
            title={chat.session?.title || __('Select a session', 'wordforge')}
            isBusy={chat.isBusy}
            hasSession={!!chat.sessionId}
            parentSession={
              chat.parentSession
                ? { id: chat.parentSession.id, title: chat.parentSession.title }
                : null
            }
            onRefresh={chat.refresh}
            onDelete={() => setShowDeleteModal(true)}
            onBackToParent={
              chat.parentSession
                ? () => chat.selectSession(chat.parentSession!.id)
                : undefined
            }
          />

          <ChatInterface chat={chat} />
        </div>

        <DeleteSessionModal
          sessionName={
            chat.session?.title || __('Untitled Session', 'wordforge')
          }
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSession}
          isDeleting={chat.isDeleting}
        />
      </div>

      <ConfigPanel
        providers={chat.providers}
        mcpStatus={mcpStatus}
        isLoading={false}
      />
    </div>
  );
};
