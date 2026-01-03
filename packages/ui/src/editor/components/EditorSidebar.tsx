import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ChatInterface } from '../../chat/components/ChatInterface';
import { ContextBadge } from '../../chat/components/ContextBadge';
import { DeleteSessionModal } from '../../chat/components/DeleteSessionModal';
import { HeaderMenu } from '../../chat/components/HeaderMenu';
import { StatusIndicator } from '../../chat/components/StatusIndicator';
import { useChat } from '../../chat/hooks/useChat';
import type { ScopedContext } from '../../chat/hooks/useContextInjection';
import { useExport } from '../../chat/hooks/useExport';
import { useMessageSearch } from '../../chat/hooks/useMessageSearch';
import styles from './EditorSidebar.module.css';
import { SessionSelector } from './SessionSelector';

interface EditorSidebarProps {
  context: ScopedContext | null;
}

export const EditorSidebar = ({ context }: EditorSidebarProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const chat = useChat({ context });
  const search = useMessageSearch(chat.messages);
  const { exportConversation } = useExport(chat.session, chat.messages);

  const handleDeleteSession = async () => {
    await chat.deleteSession();
    setShowDeleteModal(false);
  };

  return (
    <div className={styles.sidebar}>
      <SessionSelector
        sessions={chat.sessions}
        statuses={chat.statuses}
        currentSessionId={chat.sessionId}
        currentSessionTitle={chat.session?.title || __('New Chat', 'wordforge')}
        isLoading={chat.isLoadingSessions}
        isBusy={chat.isBusy}
        onSelectSession={chat.selectSession}
        onRefresh={chat.refresh}
      />

      <div className={styles.statusRow}>
        <StatusIndicator />
        <HeaderMenu
          hasSession={!!chat.sessionId}
          hasMessages={chat.messages.length > 0}
          isBusy={chat.isBusy}
          messages={chat.messages}
          providers={chat.providers}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch(!showSearch)}
          onExport={exportConversation}
          onRefresh={chat.refresh}
          onDelete={() => setShowDeleteModal(true)}
        />
      </div>

      {context && <ContextBadge context={context} />}

      <div className={styles.chatContainer}>
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
