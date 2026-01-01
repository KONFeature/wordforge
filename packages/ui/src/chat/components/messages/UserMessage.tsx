import { memo, useMemo } from '@wordpress/element';
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
}

export const UserMessage = memo(({ message }: UserMessageProps) => {
  const time = new Date(message.info.time.created * 1000).toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' },
  );

  const textParts = message.parts.filter(isTextPart);
  const contextPart = textParts.find(isContextPart);
  const messageParts = textParts.filter((p) => !isContextPart(p));
  const contextText = contextPart
    ? extractContextFromXml(contextPart.text)
    : null;

  return (
    <div className={`${styles.message} ${styles.user}`}>
      <div className={styles.messageHeader}>
        <span className={styles.messageRole}>{__('You', 'wordforge')}</span>
        <span className={styles.messageTime}>{time}</span>
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
