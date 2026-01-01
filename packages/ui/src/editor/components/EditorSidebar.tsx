import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ChatInterface } from '../../chat/components/ChatInterface';
import { DeleteSessionModal } from '../../chat/components/DeleteSessionModal';
import { ServerStatusBanner } from '../../chat/components/ServerStatusBanner';
import { useChat } from '../../chat/hooks/useChat';
import type { ScopedContext } from '../../chat/hooks/useContextInjection';
import styles from './EditorSidebar.module.css';
import { SessionSelector } from './SessionSelector';

interface ContextBadgeProps {
  context: ScopedContext;
}

const ContextBadge = ({ context }: ContextBadgeProps) => {
  const getContextLabel = (): { icon: string; label: string } => {
    switch (context.type) {
      case 'page-editor':
        return { icon: '📄', label: context.pageTitle };
      case 'template-editor':
        return { icon: '🎨', label: context.templateName };
      default:
        return { icon: '📍', label: 'Context active' };
    }
  };

  const { icon, label } = getContextLabel();

  return (
    <div className={styles.contextBadge}>
      <span className={styles.contextIcon}>{icon}</span>
      <span className={styles.contextLabel}>{label}</span>
    </div>
  );
};

interface EditorSidebarProps {
  context: ScopedContext | null;
}

export const EditorSidebar = ({ context }: EditorSidebarProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const chat = useChat({ context });

  const handleDeleteSession = async () => {
    await chat.deleteSession();
    setShowDeleteModal(false);
  };

  if (!chat.isServerReady && chat.serverStatus) {
    return (
      <div className={styles.sidebar}>
        <SessionSelector
          sessions={chat.sessions}
          statuses={chat.statuses}
          currentSessionId={chat.sessionId}
          currentSessionTitle={
            chat.session?.title || __('New Chat', 'wordforge')
          }
          isLoading={chat.isLoadingSessions}
          isBusy={chat.isBusy}
          onSelectSession={chat.selectSession}
          onRefresh={chat.refresh}
        />
        <div className={styles.serverBanner}>
          <ServerStatusBanner
            status={chat.serverStatus}
            onAutoStart={chat.startServer}
            isStarting={chat.isStartingServer}
            error={chat.serverError}
          />
        </div>
      </div>
    );
  }

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

      {context && <ContextBadge context={context} />}

      <div className={styles.chatContainer}>
        <ChatInterface chat={chat} context={context} compact />
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
