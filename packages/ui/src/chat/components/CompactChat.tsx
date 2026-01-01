import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChat } from '../hooks/useChat';
import type { ScopedContext } from '../hooks/useContextInjection';
import { ChatHeader } from './ChatHeader';
import { ChatInterface } from './ChatInterface';
import styles from './CompactChat.module.css';
import { ContextBadge } from './ContextBadge';
import { DeleteSessionModal } from './DeleteSessionModal';
import { SessionList } from './SessionList';

interface CompactChatProps {
  context?: ScopedContext | null;
  defaultSessionsCollapsed?: boolean;
}

export const CompactChat = ({
  context,
  defaultSessionsCollapsed = true,
}: CompactChatProps) => {
  const [sessionsCollapsed, setSessionsCollapsed] = useState(
    defaultSessionsCollapsed,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const chat = useChat({ context });

  const handleDeleteSession = async () => {
    await chat.deleteSession();
    setShowDeleteModal(false);
  };

  return (
    <div className={styles.root}>
      <ChatHeader
        title={chat.session?.title || __('New Chat', 'wordforge')}
        isBusy={chat.isBusy}
        hasSession={!!chat.sessionId}
        compact
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
        onToggleSessions={() => setSessionsCollapsed(!sessionsCollapsed)}
        sessionsCollapsed={sessionsCollapsed}
      />

      {context && <ContextBadge context={context} />}

      <div className={styles.body}>
        {!sessionsCollapsed && (
          <div className={styles.sessionsSidebar}>
            <SessionList
              sessions={chat.sessions}
              statuses={chat.statuses}
              currentSessionId={chat.sessionId}
              isLoading={chat.isLoadingSessions}
              onSelectSession={chat.selectSession}
              onCreateSession={() => chat.selectSession(null)}
              isCreating={chat.isSending}
            />
          </div>
        )}

        <div className={styles.chatArea}>
          <ChatInterface chat={chat} context={context} />
        </div>
      </div>

      <DeleteSessionModal
        sessionName={chat.session?.title || __('Untitled Session', 'wordforge')}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteSession}
        isDeleting={chat.isDeleting}
      />
    </div>
  );
};
