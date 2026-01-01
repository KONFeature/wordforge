import { Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { ChatState } from '../hooks/useChat';
import type { ScopedContext } from '../hooks/useContextInjection';
import styles from './ChatInterface.module.css';
import { InputArea } from './InputArea';
import { MessageList } from './MessageList';
import { QuickActions } from './QuickActions';
import { ServerStatusBanner } from './ServerStatusBanner';

interface ChatInterfaceProps {
  chat: ChatState;
  context?: ScopedContext | null;
}

export const ChatInterface = ({ chat, context = null }: ChatInterfaceProps) => {
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
    <div className={styles.root}>
      {hasSession && (
        <MessageList
          messages={chat.messages}
          isLoading={chat.isLoadingMessages}
          isThinking={chat.isBusy}
          isBusy={chat.isBusy}
          onOpenSession={chat.selectSession}
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
      />
    </div>
  );
};
