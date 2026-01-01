import { Notice } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { ChatState } from '../hooks/useChat';
import type { ScopedContext } from '../hooks/useContextInjection';
import styles from './ChatInterface.module.css';
import { InputArea } from './InputArea';
import type { ChatMessage } from './MessageList';
import { QuickActions } from './QuickActions';
import { SearchBar } from './SearchBar';
import { ServerStatusBanner } from './ServerStatusBanner';
import { VirtualizedMessageList } from './VirtualizedMessageList';

interface ChatInterfaceProps {
  chat: ChatState;
  context?: ScopedContext | null;
  compact?: boolean;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onClearSearch?: () => void;
  searchMatchCount?: number;
  isSearching?: boolean;
  filteredMessages?: ChatMessage[];
}

export const ChatInterface = ({
  chat,
  context = null,
  compact = false,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  onClearSearch,
  searchMatchCount = 0,
  isSearching = false,
  filteredMessages,
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
  const displayMessages =
    isSearching && filteredMessages ? filteredMessages : chat.messages;

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
      {showSearch && onSearchChange && onClearSearch && (
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          onClear={onClearSearch}
          matchCount={searchMatchCount}
          isSearching={isSearching}
        />
      )}

      {hasSession && (
        <VirtualizedMessageList
          messages={displayMessages}
          isLoading={chat.isLoadingMessages}
          isThinking={chat.isBusy && !isSearching}
          isBusy={chat.isBusy}
          onOpenSession={chat.selectSession}
          height={containerHeight - (showSearch ? 50 : 0)}
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
