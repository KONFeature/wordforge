import { Notice } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useClientOptional } from '../../lib/ClientProvider';
import type { ChatState } from '../hooks/useChat';
import type { ScopedContext } from '../hooks/useContextInjection';
import styles from './ChatInterface.module.css';
import { ConnectionBanner } from './ConnectionBanner';
import { InputArea } from './InputArea';
import type { ChatMessage } from './MessageList';
import { QuickActions } from './QuickActions';
import { SearchBar } from './SearchBar';
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
  const clientContext = useClientOptional();

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

  const connectionStatus = clientContext?.connectionStatus ?? {
    mode: 'disconnected' as const,
    localAvailable: false,
    remoteAvailable: false,
    localPort: 4096,
    isChecking: false,
  };
  const isConnected = connectionStatus.mode !== 'disconnected';
  const showConnectionBanner = !isConnected && !connectionStatus.isChecking;

  const config =
    window.wordforgeChat ?? window.wordforgeWidget ?? window.wordforgeEditor;
  const siteUrl = config?.siteUrl;

  if (showConnectionBanner) {
    return (
      <div className={styles.root}>
        <ConnectionBanner
          connectionStatus={connectionStatus}
          serverStatus={chat.serverStatus}
          onStartRemoteServer={chat.startServer}
          isStartingRemote={chat.isStartingServer}
          remoteError={chat.serverError}
          siteUrl={siteUrl}
          onRefresh={clientContext?.refreshStatus}
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
