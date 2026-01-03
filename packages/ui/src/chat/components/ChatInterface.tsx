import { Notice } from '@wordpress/components';
import {
  Component,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useClient } from '../../lib/ClientProvider';
import type { ChatState } from '../hooks/useChat';
import type { ScopedContext } from '../hooks/useContextInjection';
import styles from './ChatInterface.module.css';
import { ConnectionBanner } from './ConnectionBanner';
import { InputArea } from './InputArea';
import type { ChatMessage } from './MessageList';
import { QuickActions } from './QuickActions';
import { SearchBar } from './SearchBar';
import { VirtualizedMessageList } from './VirtualizedMessageList';

interface MessageErrorBoundaryProps {
  sessionId: string | null;
  isLocalServer: boolean;
  children: ReactNode;
}

interface MessageErrorBoundaryState {
  hasError: boolean;
}

class MessageErrorBoundary extends Component<
  MessageErrorBoundaryProps,
  MessageErrorBoundaryState
> {
  constructor(props: MessageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MessageErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[WordForge] Message render error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: MessageErrorBoundaryProps): void {
    if (prevProps.sessionId !== this.props.sessionId && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <MessagesErrorState
          sessionId={this.props.sessionId}
          isLocalServer={this.props.isLocalServer}
        />
      );
    }
    return this.props.children;
  }
}

interface MessagesErrorStateProps {
  sessionId: string | null;
  isLocalServer: boolean;
}

const MessagesErrorState = ({
  sessionId,
  isLocalServer,
}: MessagesErrorStateProps) => (
  <div className={styles.messagesErrorState}>
    <div className={styles.messagesErrorIcon}>⚠️</div>
    <p className={styles.messagesErrorTitle}>
      {__('Unable to load this conversation', 'wordforge')}
    </p>
    <p className={styles.messagesErrorText}>
      {__(
        'This conversation may be too large to display in the browser, or the data may be corrupted.',
        'wordforge',
      )}
    </p>
    {!isLocalServer && sessionId && (
      <p className={styles.messagesErrorHint}>
        {__(
          'You can continue this conversation in your local OpenCode instance:',
          'wordforge',
        )}{' '}
        <code>opencode --resume {sessionId}</code>
      </p>
    )}
  </div>
);

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
  const clientContext = useClient();

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
  const hasMessagesError = !!chat.messagesError;
  const showQuickActions = context && !hasMessages && !hasMessagesError;
  const displayMessages =
    isSearching && filteredMessages ? filteredMessages : chat.messages;

  const connectionStatus = clientContext.connectionStatus;
  const isConnected = connectionStatus.mode !== 'disconnected';
  const showConnectionBanner = !isConnected;

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
          onRefresh={clientContext.refetchConnectionStatus}
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

      {hasSession && hasMessagesError && (
        <MessagesErrorState
          sessionId={chat.sessionId}
          isLocalServer={config?.localServerEnabled ?? false}
        />
      )}

      {hasSession && !hasMessagesError && (
        <MessageErrorBoundary
          sessionId={chat.sessionId}
          isLocalServer={config?.localServerEnabled ?? false}
        >
          <VirtualizedMessageList
            messages={displayMessages}
            isLoading={chat.isLoadingMessages}
            isThinking={chat.isBusy && !isSearching}
            isBusy={chat.isBusy}
            session={chat.session}
            onUnrevert={chat.unrevertSession}
            isUnreverting={chat.isReverting}
            onRevert={chat.revertSession}
            onOpenSession={chat.selectSession}
            height={containerHeight - (showSearch ? 50 : 0)}
          />
        </MessageErrorBoundary>
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
        agents={chat.agents}
        selectedAgent={chat.agent}
        onSelectAgent={chat.setAgent}
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
