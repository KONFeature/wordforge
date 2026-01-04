import type { Message, Session } from '@opencode-ai/sdk/v2';
import { Spinner } from '@wordpress/components';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './MessageList.module.css';
import { RevertedHistory } from './RevertedHistory';
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
  session?: Session | undefined;
  onUnrevert?: () => void;
  isUnreverting?: boolean;
  onRevert?: (messageID: string) => void;
  onOpenSession?: (sessionId: string) => void;
}

interface SessionTurnProps {
  turn: MessageTurn;
  onRevert?: (messageID: string) => void;
  onOpenSession?: (sessionId: string) => void;
}

const SessionTurn = ({ turn, onRevert, onOpenSession }: SessionTurnProps) => {
  return (
    <div className={styles.turn}>
      <UserMessage message={turn.userMessage} onRevert={onRevert} />
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
  session,
  onUnrevert,
  isUnreverting = false,
  onRevert,
  onOpenSession,
}: MessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const { activeTurns, revertedTurns } = useMemo(() => {
    if (!session?.revert?.messageID) {
      return { activeTurns: turns, revertedTurns: [] };
    }

    const revertIndex = turns.findIndex(
      (turn) => turn.userMessage.info.id === session.revert?.messageID,
    );

    if (revertIndex === -1) {
      return { activeTurns: turns, revertedTurns: [] };
    }

    return {
      activeTurns: turns.slice(0, revertIndex),
      revertedTurns: turns.slice(revertIndex),
    };
  }, [turns, session]);

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
        {activeTurns.map((turn) => (
          <SessionTurn
            key={turn.userMessage.info.id}
            turn={turn}
            onRevert={onRevert}
            onOpenSession={onOpenSession}
          />
        ))}

        {session?.revert?.messageID && (
          <>
            <hr
              className={styles.revertDivider}
              aria-label={__('Revert boundary', 'wordforge')}
            />
            <RevertedHistory
              turns={revertedTurns}
              onUnrevert={onUnrevert ?? (() => {})}
              isUnreverting={isUnreverting}
              onOpenSession={onOpenSession}
            />
          </>
        )}

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
