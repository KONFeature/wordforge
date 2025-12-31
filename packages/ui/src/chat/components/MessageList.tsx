import type {
  Message,
  Part,
  TextPart,
  ToolPart,
} from '@opencode-ai/sdk/client';
import { Spinner } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './MessageList.module.css';

export interface ChatMessage {
  info: Message;
  parts: Part[];
}

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  isBusy: boolean;
}

const isTextPart = (part: Part): part is TextPart => part.type === 'text';
const isToolPart = (part: Part): part is ToolPart => part.type === 'tool';

const ToolCallItem = ({ part }: { part: ToolPart }) => {
  const [expanded, setExpanded] = useState(false);
  const state = part.state;
  const status = state.status;
  const title = ('title' in state && state.title) || part.tool || 'unknown';

  let statusLabel = __('Pending', 'wordforge');
  if (status === 'running') statusLabel = __('Running', 'wordforge');
  else if (status === 'completed') statusLabel = __('Completed', 'wordforge');
  else if (status === 'error') statusLabel = __('Failed', 'wordforge');

  const input = 'input' in state ? state.input : undefined;
  const output =
    'output' in state && state.status === 'completed'
      ? state.output
      : undefined;
  const error =
    'error' in state && state.status === 'error' ? state.error : undefined;

  return (
    <div className={styles.toolCall}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={styles.toolHeader}
      >
        <span className={styles.toolName}>{title}</span>
        <span className={`${styles.toolStatus} ${styles[status]}`}>
          {statusLabel}
        </span>
        <span className={styles.toolExpander}>{expanded ? '-' : '+'}</span>
      </button>

      {expanded && (
        <div className={styles.toolBody}>
          {input && (
            <div className={styles.toolSection}>
              <div className={styles.toolSectionLabel}>Input</div>
              <pre className={styles.toolSectionContent}>
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output && (
            <div className={styles.toolSection}>
              <div className={styles.toolSectionLabel}>Output</div>
              <pre className={styles.toolSectionContent}>
                {typeof output === 'string'
                  ? output
                  : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {error && (
            <div className={styles.toolSection}>
              <div className={styles.toolSectionLabel}>Error</div>
              <pre className={`${styles.toolSectionContent} ${styles.error}`}>
                {error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MessageItem = ({ message }: { message: ChatMessage }) => {
  const isUser = message.info.role === 'user';
  const hasError =
    message.info.role === 'assistant' && message.info.error != null;
  const time = new Date(message.info.time.created * 1000).toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' },
  );

  const modelInfo =
    message.info.role === 'assistant'
      ? {
          provider: message.info.providerID,
          model: message.info.modelID,
        }
      : null;

  const textParts = message.parts.filter(isTextPart);
  const toolParts = message.parts.filter(isToolPart);

  const messageClassName = `${styles.message} ${isUser ? styles.user : ''} ${hasError ? styles.error : ''}`;

  return (
    <div className={messageClassName}>
      <div className={styles.messageHeader}>
        <span className={styles.messageRole}>
          {isUser ? __('You', 'wordforge') : __('Assistant', 'wordforge')}
        </span>
        <span className={styles.messageTime}>{time}</span>
        {modelInfo?.model && (
          <span className={styles.messageModel}>
            🤖 {modelInfo.provider}/{modelInfo.model}
          </span>
        )}
      </div>

      {textParts.map((part, i) => (
        <div key={part.id || i} className={styles.messageContent}>
          {part.text}
        </div>
      ))}

      {hasError && message.info.role === 'assistant' && message.info.error && (
        <div className={styles.messageError}>
          {'data' in message.info.error && message.info.error.data
            ? (message.info.error.data as { message?: string }).message ||
              __('Error', 'wordforge')
            : __('Error', 'wordforge')}
        </div>
      )}

      {toolParts.length > 0 && (
        <div className={styles.toolCalls}>
          {toolParts.map((part) => (
            <ToolCallItem key={part.id} part={part} />
          ))}
        </div>
      )}
    </div>
  );
};

export const MessageList = ({
  messages,
  isLoading,
  isThinking,
}: MessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null);

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
        {messages.map((msg) => (
          <MessageItem key={msg.info.id} message={msg} />
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
