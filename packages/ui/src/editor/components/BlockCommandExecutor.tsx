import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { ChatMessage } from '../../chat/components/MessageList';
import type { TextPart } from '../../chat/components/messages/types';
import { isTextPart } from '../../chat/components/messages/types';
import { useBlockCommandParser } from '../hooks/useBlockCommandParser';
import { useGutenbergBridge } from '../hooks/useGutenbergBridge';
import type { BlockOperationResult } from '../types/gutenberg';
import styles from './BlockCommandExecutor.module.css';

interface BlockCommandExecutorProps {
  messages: ChatMessage[];
}

interface ExecutionLog {
  timestamp: number;
  results: BlockOperationResult[];
}

export const BlockCommandExecutor = ({
  messages,
}: BlockCommandExecutorProps) => {
  const { isAvailable } = useGutenbergBridge();
  const { parseAndExecute, hasBlockCommands } = useBlockCommandParser();
  const [lastExecution, setLastExecution] = useState<ExecutionLog | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAvailable || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.parts) return;

    const textParts = lastMessage.parts.filter(isTextPart) as TextPart[];

    for (const part of textParts) {
      const partKey = `${lastMessage.info.id}-${part.id}-${part.text.slice(0, 50)}`;

      if (processedMessagesRef.current.has(partKey)) continue;
      if (!hasBlockCommands(part.text)) continue;

      processedMessagesRef.current.add(partKey);

      const results = parseAndExecute(part.text);
      if (results.length > 0) {
        setLastExecution({
          timestamp: Date.now(),
          results,
        });
      }
    }
  }, [messages, isAvailable, parseAndExecute, hasBlockCommands]);

  if (!lastExecution) return null;

  const hasSuccess = lastExecution.results.some((r) => r.success);
  const hasError = lastExecution.results.some((r) => !r.success);

  const timeSince = Math.floor((Date.now() - lastExecution.timestamp) / 1000);
  if (timeSince > 10) return null;

  return (
    <div
      className={`${styles.executor} ${hasSuccess ? styles.success : ''} ${hasError ? styles.error : ''}`}
    >
      <span className={styles.icon}>{hasSuccess ? '✓' : '✗'}</span>
      <span className={styles.text}>
        {hasSuccess
          ? __('Blocks inserted into editor', 'wordforge')
          : (lastExecution.results[0]?.error ??
            __('Failed to execute block command', 'wordforge'))}
      </span>
    </div>
  );
};
