import type { Message } from '@opencode-ai/sdk/client';
import { Spinner } from '@wordpress/components';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './MessageList.module.css';
import {
  AssistantMessage,
  type ChatMessage,
  type MessageTurn,
  UserMessage,
  groupMessagesIntoTurns,
} from './messages';

export type { ChatMessage };

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  isBusy: boolean;
  onOpenSession?: (sessionId: string) => void;
}

interface SessionTurnProps {
  turn: MessageTurn;
  onOpenSession?: (sessionId: string) => void;
}

const SessionTurn = ({ turn, onOpenSession }: SessionTurnProps) => {
  return (
    <div className={styles.turn}>
      <UserMessage message={turn.userMessage} />
      <AssistantMessage
        messages={turn.assistantMessages}
        isComplete={turn.isComplete}
        onOpenSession={onOpenSession}
      />
    </div>
  );
};

export const MessageList = ({
  messages,
  isLoading,
  isThinking,
  onOpenSession,
}: MessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        {turns.map((turn) => (
          <SessionTurn
            key={turn.userMessage.info.id}
            turn={turn}
            onOpenSession={onOpenSession}
          />
        ))}

        {isThinking && (
          <div className={styles.thinking}>
            <div className={styles.thinkingHeader}>
              <span className={styles.messageRole}>
                {__('Assistant', 'wordforge')}
              </span>
            </div>
            <div className={styles.thinkingContent}>
              <Spinner />
              <span>{__('Thinking...', 'wordforge')}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
