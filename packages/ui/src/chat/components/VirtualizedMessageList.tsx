import type { Session } from '@opencode-ai/sdk/client';
import { Spinner } from '@wordpress/components';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { List, useListRef } from 'react-window';
import { MessageList } from './MessageList';
import styles from './MessageList.module.css';
import {
  AssistantMessage,
  type ChatMessage,
  type MessageTurn,
  UserMessage,
  groupMessagesIntoTurns,
} from './messages';

export type { ChatMessage };

const ESTIMATED_ROW_HEIGHT = 300;
const MIN_VIRTUALIZATION_THRESHOLD = 20;

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  isBusy: boolean;
  session?: Session | undefined;
  onUnrevert?: () => void;
  isUnreverting?: boolean;
  onRevert?: (messageID: string) => void;
  onOpenSession?: (sessionId: string) => void;
  height?: number;
}

interface TurnRowProps {
  turn: MessageTurn;
  onRevert?: (messageID: string) => void;
  onOpenSession?: (sessionId: string) => void;
}

const TurnRow = ({ turn, onRevert, onOpenSession }: TurnRowProps) => {
  return (
    <div className={styles.turn}>
      <UserMessage message={turn.userMessage} onRevert={onRevert} />
      <AssistantMessage
        messages={turn.assistantMessages}
        onOpenSession={onOpenSession}
      />
    </div>
  );
};

export const VirtualizedMessageList = ({
  messages,
  isLoading,
  isThinking,
  isBusy,
  session,
  onUnrevert,
  isUnreverting = false,
  onRevert,
  onOpenSession,
  height = 600,
}: VirtualizedMessageListProps) => {
  const listRef = useListRef();
  const endRef = useRef<HTMLDivElement>(null);

  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

  useEffect(() => {
    if (turns.length > MIN_VIRTUALIZATION_THRESHOLD && listRef.current) {
      listRef.current.scrollToItem(turns.length - 1);
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns.length, isThinking, listRef]);

  if (isLoading && messages.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div
          className={`${styles.emptyIcon} dashicons dashicons-format-chat`}
        />
        <p className={styles.emptyText}>
          {__(
            'Select a session to view messages, or create a new one.',
            'wordforge',
          )}
        </p>
      </div>
    );
  }

  if (session?.revert?.messageID) {
    return (
      <MessageList
        messages={messages}
        isLoading={isLoading}
        isThinking={isThinking}
        isBusy={isBusy}
        session={session}
        onUnrevert={onUnrevert}
        isUnreverting={isUnreverting}
        onRevert={onRevert}
        onOpenSession={onOpenSession}
      />
    );
  }

  const shouldVirtualize = turns.length > MIN_VIRTUALIZATION_THRESHOLD;

  if (!shouldVirtualize) {
    return (
      <div className={styles.root}>
        <div className={styles.container}>
          {turns.map((turn) => (
            <TurnRow
              key={turn.userMessage.info.id}
              turn={turn}
              onRevert={onRevert}
              onOpenSession={onOpenSession}
            />
          ))}
          {isThinking && <ThinkingIndicator />}
          <div ref={endRef} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <List
        ref={listRef}
        height={height}
        itemCount={turns.length}
        itemSize={ESTIMATED_ROW_HEIGHT}
        width="100%"
        className={styles.virtualList}
      >
        {({ index, style }) => (
          <div style={style}>
            <TurnRow
              turn={turns[index]}
              onRevert={onRevert}
              onOpenSession={onOpenSession}
            />
          </div>
        )}
      </List>
      {isThinking && <ThinkingIndicator />}
    </div>
  );
};

const ThinkingIndicator = () => (
  <div className={styles.thinking}>
    <div className={styles.thinkingHeader}>
      <span className={styles.messageRole}>{__('Assistant', 'wordforge')}</span>
    </div>
    <div className={styles.thinkingContent}>
      <Spinner />
      <span>{__('Thinking...', 'wordforge')}</span>
    </div>
  </div>
);
