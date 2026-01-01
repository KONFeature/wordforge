import { Notice } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { ChatState } from '../hooks/useChat';
import type { ScopedContext } from '../hooks/useContextInjection';
import styles from './ChatInterface.module.css';
import { InputArea } from './InputArea';
import { QuickActions } from './QuickActions';
import { ServerStatusBanner } from './ServerStatusBanner';
import { VirtualizedMessageList } from './VirtualizedMessageList';

interface ChatInterfaceProps {
  chat: ChatState;
  context?: ScopedContext | null;
  compact?: boolean;
}

export const ChatInterface = ({
  chat,
  context = null,
  compact = false,
}: ChatInterfaceProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(Math.max(300, rect.height - 100));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const hasSession = !!chat.sessionId;
  const hasMessages = chat.messages.length > 0;
  const showQuickActions = context && !hasMessages;

  if (!chat.isServerReady && chat.serverStatus) {
    return (
      <div className={styles.root}>
        <ServerStatusBanner
          status={chat.serverStatus}
          onAutoStart={chat.startServer}
          isStarting={chat.isStartingServer}
          error={chat.serverError}
        />
      </div>
    );
  }

  return (
    <div className={styles.root} ref={containerRef}>
      {hasSession && (
        <VirtualizedMessageList
          messages={chat.messages}
          isLoading={chat.isLoadingMessages}
          isThinking={chat.isBusy}
          isBusy={chat.isBusy}
          onOpenSession={chat.selectSession}
          height={containerHeight}
        />
      )}

      {!hasSession && (
        <div className={styles.welcomeArea}>
          <div className={styles.welcomeIcon}>💬</div>
          <p className={styles.welcomeText}>
            {__('Start a conversation with your AI assistant', 'wordforge')}
          </p>
        </div>
      )}

      {chat.error && (
        <div className={styles.errorContainer}>
          <Notice status="error" onRemove={chat.resetError} isDismissible>
            {chat.error.message}
          </Notice>
        </div>
      )}

      {showQuickActions && (
        <QuickActions
          context={context}
          onSelectAction={chat.send}
          disabled={chat.isBusy}
        />
      )}

      <InputArea
        onSend={chat.send}
        onAbort={chat.abort}
        disabled={false}
        isBusy={chat.isBusy}
        providers={chat.providers}
        selectedModel={chat.model}
        onSelectModel={chat.setModel}
        placeholder={
          hasSession
            ? __('Type your message...', 'wordforge')
            : __('Start a chat by typing here...', 'wordforge')
        }
        compact={compact}
      />
    </div>
  );
};
