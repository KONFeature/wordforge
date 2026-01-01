import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { Button, Notice } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useChatCore } from '../hooks/useChatCore';
import type { ScopedContext } from '../hooks/useContextInjection';
import { useAutoStartServer, useServerStatus } from '../hooks/useServerStatus';
import styles from './CompactChat.module.css';
import { DeleteSessionModal } from './DeleteSessionModal';
import { InputArea } from './InputArea';
import { MessageList } from './MessageList';
import { QuickActions } from './QuickActions';
import { ServerStatusBanner } from './ServerStatusBanner';
import { SessionList } from './SessionList';

interface ContextBadgeProps {
  context: ScopedContext;
}

const ContextBadge = ({ context }: ContextBadgeProps) => {
  const getContextLabel = (): { icon: string; label: string } => {
    switch (context.type) {
      case 'product-editor':
        return { icon: '📦', label: context.productName };
      case 'product-list':
        return { icon: '📦', label: `${context.totalProducts} products` };
      case 'page-editor':
        return { icon: '📄', label: context.pageTitle };
      case 'page-list':
        return { icon: '📄', label: `${context.totalPosts} pages` };
      case 'post-list':
        return { icon: '📝', label: `${context.totalPosts} posts` };
      case 'media-list':
        return { icon: '🖼️', label: `${context.totalMedia} media files` };
      case 'template-editor':
        return { icon: '🎨', label: context.templateName };
      case 'custom':
        return { icon: '💡', label: 'Custom context' };
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

interface EmptyStateProps {
  onCreateSession: () => void;
  isCreating: boolean;
  context: ScopedContext | null;
  onQuickAction: (prompt: string) => void;
}

const EmptyState = ({
  onCreateSession,
  isCreating,
  context,
  onQuickAction,
}: EmptyStateProps) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>💬</div>
    <p className={styles.emptyText}>
      {__('Start a conversation with your AI assistant', 'wordforge')}
    </p>
    <Button
      variant="primary"
      onClick={onCreateSession}
      isBusy={isCreating}
      disabled={isCreating}
    >
      {isCreating
        ? __('Creating...', 'wordforge')
        : __('New Chat', 'wordforge')}
    </Button>
    {context && (
      <div className={styles.emptyQuickActions}>
        <p className={styles.quickActionsLabel}>
          {__('Or try a quick action:', 'wordforge')}
        </p>
        <QuickActions
          context={context}
          onSelectAction={onQuickAction}
          disabled={isCreating}
        />
      </div>
    )}
  </div>
);

interface CompactChatProps {
  client: OpencodeClient;
  context?: ScopedContext | null;
  defaultSessionsCollapsed?: boolean;
}

export const CompactChat = ({
  client,
  context,
  defaultSessionsCollapsed = true,
}: CompactChatProps) => {
  const [sessionsCollapsed, setSessionsCollapsed] = useState(
    defaultSessionsCollapsed,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const chat = useChatCore(client, { context });

  const { data: serverStatus } = useServerStatus();
  const autoStart = useAutoStartServer();

  const errorMessage = chat.error?.message ?? null;
  const hasSession = !!chat.currentSessionId;
  const hasMessages = (chat.messages ?? []).length > 0;

  const handleQuickAction = async (prompt: string) => {
    if (!hasSession) {
      const newSession = await chat.handleCreateSession();
      if (!newSession) return;

      await new Promise((resolve) => setTimeout(resolve, 250));
      chat.handleSendMessage(prompt, newSession.id);
    } else {
      chat.handleSendMessage(prompt);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            icon={sessionsCollapsed ? 'menu' : 'no-alt'}
            label={
              sessionsCollapsed
                ? __('Show sessions', 'wordforge')
                : __('Hide sessions', 'wordforge')
            }
            onClick={() => setSessionsCollapsed(!sessionsCollapsed)}
            className={styles.menuButton}
            isSmall
          />
          <span className={styles.sessionTitle}>
            {chat.currentSession?.title || __('New Chat', 'wordforge')}
          </span>
          {hasSession && (
            <span
              className={`${styles.statusBadge} ${chat.isBusy ? styles.busy : styles.ready}`}
            >
              {chat.isBusy ? __('Busy', 'wordforge') : __('Ready', 'wordforge')}
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          {hasSession && (
            <>
              <Button
                icon="update"
                label={__('Refresh', 'wordforge')}
                onClick={() => chat.refetchMessages()}
                isSmall
              />
              <Button
                icon="trash"
                label={__('Delete Session', 'wordforge')}
                onClick={() => setShowDeleteModal(true)}
                isSmall
                isDestructive
              />
            </>
          )}
        </div>
      </div>

      {context && <ContextBadge context={context} />}

      <div className={styles.body}>
        {!sessionsCollapsed && (
          <div className={styles.sessionsSidebar}>
            <SessionList
              sessions={chat.sessions ?? []}
              statuses={chat.statuses ?? {}}
              currentSessionId={chat.currentSessionId}
              isLoading={chat.isLoadingSessions}
              onSelectSession={chat.handleSelectSession}
              onCreateSession={chat.handleCreateSession}
              isCreating={chat.isCreatingSession}
            />
          </div>
        )}

        <div className={styles.chatArea}>
          {serverStatus && !serverStatus.running ? (
            <ServerStatusBanner
              status={serverStatus}
              onAutoStart={() => autoStart.mutate()}
              isStarting={autoStart.isPending}
              error={
                autoStart.error instanceof Error
                  ? autoStart.error.message
                  : null
              }
            />
          ) : hasSession ? (
            <>
              <MessageList
                messages={chat.messages ?? []}
                isLoading={chat.isLoadingMessages}
                isThinking={chat.isBusy}
                isBusy={chat.isBusy}
              />

              {errorMessage && (
                <div className={styles.errorContainer}>
                  <Notice
                    status="error"
                    onRemove={chat.resetErrors}
                    isDismissible
                  >
                    {errorMessage}
                  </Notice>
                </div>
              )}

              {context && !hasMessages && (
                <QuickActions
                  context={context}
                  onSelectAction={handleQuickAction}
                  disabled={chat.isBusy}
                />
              )}

              <InputArea
                onSend={chat.handleSendMessage}
                onAbort={chat.handleAbort}
                disabled={false}
                isBusy={chat.isBusy}
                providers={chat.providers ?? []}
                selectedModel={chat.selectedModel}
                onSelectModel={chat.setSelectedModel}
              />
            </>
          ) : (
            <EmptyState
              onCreateSession={chat.handleCreateSession}
              isCreating={chat.isCreatingSession}
              context={context ?? null}
              onQuickAction={handleQuickAction}
            />
          )}
        </div>
      </div>

      <DeleteSessionModal
        sessionName={
          chat.currentSession?.title || __('Untitled Session', 'wordforge')
        }
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await chat.handleDeleteSession();
          setShowDeleteModal(false);
        }}
        isDeleting={chat.isDeletingSession}
      />
    </div>
  );
};
