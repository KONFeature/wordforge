import { memo, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
  extractContextFromXml,
  isContextPart,
} from '../../hooks/useContextInjection';
import styles from '../MessageList.module.css';
import { Markdown } from './Markdown';
import { MessageContextBadge } from './MessageContextBadge';
import type { ChatMessage } from './types';
import { isTextPart } from './types';

interface UserMessageProps {
  message: ChatMessage;
  onRevert?: (messageID: string) => void;
}

export const UserMessage = memo(({ message, onRevert }: UserMessageProps) => {
  if (!message?.info) return null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createdTime = message.info.time?.created;
  const time = createdTime
    ? new Date(createdTime * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const parts = message.parts || [];
  const textParts = parts.filter(isTextPart);
  const contextPart = textParts.find(isContextPart);
  const messageParts = textParts.filter((p) => !isContextPart(p));
  const contextText = contextPart
    ? extractContextFromXml(contextPart.text)
    : null;

  const handleRevert = () => {
    if (onRevert && message.info.id) {
      onRevert(message.info.id);
      setIsMenuOpen(false);
    }
  };

  // Close menu when clicking outside
  useMemo(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <div className={`${styles.message} ${styles.user}`}>
      <div className={styles.messageHeader}>
        <div className={styles.messageHeaderLeft}>
          <span className={styles.messageRole}>{__('You', 'wordforge')}</span>
          <span className={styles.messageTime}>{time}</span>
        </div>

        {onRevert && (
          <div className={styles.messageHeaderRight}>
            <button
              ref={buttonRef}
              type="button"
              className={styles.messageMenuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={__('Message options', 'wordforge')}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
            >
              <span aria-hidden="true">•••</span>
            </button>

            {isMenuOpen && (
              <div ref={menuRef} className={styles.messageMenuDropdown}>
                <button
                  type="button"
                  className={styles.messageMenuItem}
                  onClick={handleRevert}
                >
                  <span className={styles.messageMenuIcon} aria-hidden="true">
                    ↩
                  </span>
                  {__('Revert to this message', 'wordforge')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {contextText && <MessageContextBadge contextText={contextText} />}
      {messageParts.map((part, i) => (
        <div key={part.id || i} className={styles.messageContent}>
          <Markdown>{part.text}</Markdown>
        </div>
      ))}
    </div>
  );
});
