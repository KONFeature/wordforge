import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChat } from '../hooks/useChat';
import type { ScopedContext } from '../hooks/useContextInjection';
import { useExport } from '../hooks/useExport';
import { useMessageSearch } from '../hooks/useMessageSearch';
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
  const [showSearch, setShowSearch] = useState(false);

  const chat = useChat({ context });
  const search = useMessageSearch(chat.messages);
  const { exportConversation } = useExport(chat.session ?? null, chat.messages);

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
        hasMessages={chat.messages.length > 0}
        messages={chat.messages}
        providers={chat.providers}
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
        onToggleSearch={() => setShowSearch(!showSearch)}
        onExport={exportConversation}
        showSearch={showSearch}
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
          <ChatInterface
            chat={chat}
            context={context}
            compact
            showSearch={showSearch}
            searchQuery={search.searchQuery}
            onSearchChange={search.setSearchQuery}
            onClearSearch={search.clearSearch}
            searchMatchCount={search.matchCount}
            isSearching={search.isSearching}
            filteredMessages={search.filteredMessages}
          />
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
