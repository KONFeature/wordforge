import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';

interface MessageContextBadgeProps {
  contextText: string;
}

export const MessageContextBadge = ({
  contextText,
}: MessageContextBadgeProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.contextBadge}>
      <button
        type="button"
        className={styles.contextBadgeHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.contextBadgeIcon}>&#128205;</span>
        <span className={styles.contextBadgeLabel}>
          {__('Page Context', 'wordforge')}
        </span>
        <span className={styles.contextBadgeExpander}>
          {expanded ? '-' : '+'}
        </span>
      </button>
      {expanded && (
        <div className={styles.contextBadgeContent}>{contextText}</div>
      )}
    </div>
  );
};
