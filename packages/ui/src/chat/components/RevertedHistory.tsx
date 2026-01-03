import { Button } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import styles from './MessageList.module.css';
import { AssistantMessage, type MessageTurn, UserMessage } from './messages';

interface RevertedHistoryProps {
  turns: MessageTurn[];
  onUnrevert: () => void;
  isUnreverting?: boolean;
  onOpenSession?: (sessionId: string) => void;
}

export const RevertedHistory = ({
  turns,
  onUnrevert,
  isUnreverting = false,
  onOpenSession,
}: RevertedHistoryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasRevertedTurns = turns.length > 0;

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  return (
    <div className={styles.revertedContainer}>
      <div className={styles.revertedHeader}>
        {hasRevertedTurns ? (
          <button
            type="button"
            className={styles.revertedTitleButton}
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
          >
            <span className={styles.revertedIcon} aria-hidden="true">
              ↩
            </span>
            <span>
              {sprintf(
                __('%d Reverted Message%s', 'wordforge'),
                turns.length,
                turns.length !== 1 ? 's' : '',
              )}
            </span>
          </button>
        ) : (
          <div className={styles.revertedTitleButton}>
            <span className={styles.revertedIcon} aria-hidden="true">
              ↩
            </span>
            <span>{__('Conversation reverted', 'wordforge')}</span>
          </div>
        )}
        <div className={styles.revertedActions}>
          <Button
            variant="secondary"
            onClick={onUnrevert}
            disabled={isUnreverting}
            className={styles.unrevertButton}
          >
            {isUnreverting
              ? __('Restoring...', 'wordforge')
              : __('Unrevert', 'wordforge')}
          </Button>
          {hasRevertedTurns && (
            <Button
              icon={isExpanded ? 'arrow-up' : 'arrow-down'}
              onClick={toggleExpanded}
              aria-label={
                isExpanded
                  ? __('Collapse', 'wordforge')
                  : __('Expand', 'wordforge')
              }
            />
          )}
        </div>
      </div>

      {isExpanded && hasRevertedTurns && (
        <div className={styles.revertedContent}>
          {turns.map((turn) => (
            <div
              key={turn.userMessage.info.id}
              className={`${styles.turn} ${styles.turnReverted}`}
            >
              <UserMessage message={turn.userMessage} />
              <AssistantMessage
                messages={turn.assistantMessages}
                onOpenSession={onOpenSession}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
