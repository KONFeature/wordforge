import type {
  AssistantMessage,
  Message,
  Part,
  ReasoningPart,
  TextPart,
  ToolPart,
  UserMessage,
} from '@opencode-ai/sdk/client';
import { Spinner } from '@wordpress/components';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import ReactMarkdown from 'react-markdown';
import {
  extractContextFromXml,
  isContextPart,
} from '../hooks/useContextInjection';
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
  onOpenSession?: (sessionId: string) => void;
}

const isUserMessage = (msg: Message): msg is UserMessage => msg.role === 'user';
const isAssistantMessage = (msg: Message): msg is AssistantMessage =>
  msg.role === 'assistant';
const isTextPart = (part: Part): part is TextPart => part.type === 'text';
const isToolPart = (part: Part): part is ToolPart => part.type === 'tool';
const isReasoningPart = (part: Part): part is ReasoningPart =>
  part.type === 'reasoning';

const isTaskTool = (part: ToolPart): boolean => part.tool === 'task';

const getTaskSessionId = (part: ToolPart): string | undefined => {
  const state = part.state;
  if ('metadata' in state && state.metadata) {
    return state.metadata.sessionId as string | undefined;
  }
  return undefined;
};

interface MessageTurn {
  userMessage: ChatMessage;
  assistantMessages: ChatMessage[];
  isComplete: boolean;
}

function groupMessagesIntoTurns(messages: ChatMessage[]): MessageTurn[] {
  const turns: MessageTurn[] = [];
  const userMessages = messages.filter((m) => isUserMessage(m.info));

  for (const userMsg of userMessages) {
    const assistantMsgs = messages.filter(
      (m) => isAssistantMessage(m.info) && m.info.parentID === userMsg.info.id,
    );

    const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
    const isComplete =
      lastAssistant &&
      isAssistantMessage(lastAssistant.info) &&
      lastAssistant.info.finish === 'stop';

    turns.push({
      userMessage: userMsg,
      assistantMessages: assistantMsgs,
      isComplete,
    });
  }

  return turns;
}

const ContextBadge = ({ contextText }: { contextText: string }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.contextBadge}>
      <button
        type="button"
        className={styles.contextBadgeHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.contextBadgeIcon}>📍</span>
        <span className={styles.contextBadgeLabel}>
          {__('Page Context', 'wordforge')}
        </span>
        <span className={styles.contextBadgeExpander}>
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && (
        <div className={styles.contextBadgeContent}>{contextText}</div>
      )}
    </div>
  );
};

const Markdown = ({ children }: { children: string }) => (
  <ReactMarkdown
    components={{
      pre: ({ children }) => <pre className={styles.codeBlock}>{children}</pre>,
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        return isInline ? (
          <code className={styles.inlineCode} {...props}>
            {children}
          </code>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }}
  >
    {children}
  </ReactMarkdown>
);

interface CollapsibleStepProps {
  title: string;
  subtitle?: string;
  status?: 'pending' | 'running' | 'completed' | 'error';
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const CollapsibleStep = ({
  title,
  subtitle,
  status,
  defaultExpanded = false,
  children,
}: CollapsibleStepProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const statusLabels: Record<string, string> = {
    pending: __('Pending', 'wordforge'),
    running: __('Running', 'wordforge'),
    completed: __('Completed', 'wordforge'),
    error: __('Failed', 'wordforge'),
  };

  return (
    <div className={styles.step}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={styles.stepHeader}
      >
        <span className={styles.stepTitle}>
          {title}
          {subtitle && <span className={styles.stepSubtitle}>{subtitle}</span>}
        </span>
        {status && (
          <span className={`${styles.stepStatus} ${styles[status]}`}>
            {statusLabels[status]}
          </span>
        )}
        <span className={styles.stepExpander}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className={styles.stepBody}>{children}</div>}
    </div>
  );
};

const ToolCallStep = ({ part }: { part: ToolPart }) => {
  const state = part.state;
  const status = state.status;
  const title = ('title' in state && state.title) || part.tool || 'unknown';

  const input = 'input' in state ? state.input : undefined;
  const output =
    'output' in state && state.status === 'completed'
      ? state.output
      : undefined;
  const error =
    'error' in state && state.status === 'error' ? state.error : undefined;

  const hasContent = input || output || error;

  if (!hasContent) {
    return (
      <div className={`${styles.simpleStep} ${styles[status]}`}>
        {status === 'running' || status === 'pending' ? <Spinner /> : null}
        <span>{title}</span>
        {status && status !== 'running' && status !== 'pending' && (
          <span className={`${styles.simpleStepStatus} ${styles[status]}`}>
            {status === 'completed'
              ? __('Done', 'wordforge')
              : status === 'error'
                ? __('Failed', 'wordforge')
                : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <CollapsibleStep title={title} status={status} defaultExpanded={false}>
      {input && (
        <div className={styles.stepSection}>
          <div className={styles.stepSectionLabel}>
            {__('Input', 'wordforge')}
          </div>
          <pre className={styles.stepSectionContent}>
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
      {output && (
        <div className={styles.stepSection}>
          <div className={styles.stepSectionLabel}>
            {__('Output', 'wordforge')}
          </div>
          <pre className={styles.stepSectionContent}>
            {typeof output === 'string'
              ? output
              : JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
      {error && (
        <div className={styles.stepSection}>
          <div className={styles.stepSectionLabel}>
            {__('Error', 'wordforge')}
          </div>
          <pre className={`${styles.stepSectionContent} ${styles.error}`}>
            {error}
          </pre>
        </div>
      )}
    </CollapsibleStep>
  );
};

interface TaskToolStepProps {
  part: ToolPart;
  onOpenSession?: (sessionId: string) => void;
}

const TaskToolStep = ({ part, onOpenSession }: TaskToolStepProps) => {
  const state = part.state;
  const status = state.status;
  const title =
    ('title' in state && state.title) || __('Sub-agent Task', 'wordforge');
  const sessionId = getTaskSessionId(part);

  const statusLabels: Record<string, string> = {
    pending: __('Pending', 'wordforge'),
    running: __('Running', 'wordforge'),
    completed: __('Completed', 'wordforge'),
    error: __('Failed', 'wordforge'),
  };

  const handleOpenSession = () => {
    if (sessionId && onOpenSession) {
      onOpenSession(sessionId);
    }
  };

  return (
    <div className={`${styles.taskStep} ${styles[status]}`}>
      <div className={styles.taskStepHeader}>
        {status === 'running' || status === 'pending' ? <Spinner /> : null}
        <span className={styles.taskStepIcon}>🤖</span>
        <span className={styles.taskStepTitle}>{title}</span>
        <span className={`${styles.taskStepStatus} ${styles[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      {sessionId && onOpenSession && (
        <button
          type="button"
          className={styles.taskStepLink}
          onClick={handleOpenSession}
        >
          {__('View Session', 'wordforge')} →
        </button>
      )}
    </div>
  );
};

const ReasoningStep = ({ part }: { part: ReasoningPart }) => {
  const hasContent = part.text && part.text.trim().length > 0;

  if (!hasContent) {
    return (
      <div className={styles.simpleStep}>
        <span>{__('Thinking...', 'wordforge')}</span>
      </div>
    );
  }

  return (
    <CollapsibleStep
      title={__('Thinking', 'wordforge')}
      defaultExpanded={false}
    >
      <div className={styles.reasoningContent}>
        <Markdown>{part.text}</Markdown>
      </div>
    </CollapsibleStep>
  );
};

const UserMessageBlock = ({ message }: { message: ChatMessage }) => {
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
      {contextText && <ContextBadge contextText={contextText} />}
      {messageParts.map((part, i) => (
        <div key={part.id || i} className={styles.messageContent}>
          <Markdown>{part.text}</Markdown>
        </div>
      ))}
    </div>
  );
};

interface AssistantResponseBlockProps {
  messages: ChatMessage[];
  isComplete: boolean;
  onOpenSession?: (sessionId: string) => void;
}

const AssistantResponseBlock = ({
  messages,
  isComplete,
  onOpenSession,
}: AssistantResponseBlockProps) => {
  if (messages.length === 0) return null;

  const allParts: Part[] = messages.flatMap((m) => m.parts);
  const allSteps = allParts.filter(
    (p) => isToolPart(p) || isReasoningPart(p),
  ) as (ToolPart | ReasoningPart)[];
  const allTextParts = allParts.filter(isTextPart);

  const firstMsg = messages[0];
  const modelInfo = isAssistantMessage(firstMsg.info)
    ? { provider: firstMsg.info.providerID, model: firstMsg.info.modelID }
    : null;

  const time = new Date(firstMsg.info.time.created * 1000).toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' },
  );

  const errorMessage = messages.find(
    (m) => isAssistantMessage(m.info) && m.info.error,
  );
  const hasError = !!errorMessage;

  return (
    <div className={`${styles.message} ${hasError ? styles.error : ''}`}>
      <div className={styles.messageHeader}>
        <span className={styles.messageRole}>
          {__('Assistant', 'wordforge')}
        </span>
        <span className={styles.messageTime}>{time}</span>
        {modelInfo?.model && (
          <span className={styles.messageModel}>
            🤖 {modelInfo.provider}/{modelInfo.model}
          </span>
        )}
      </div>

      {allSteps.length > 0 && (
        <div className={styles.stepsContainer}>
          {allSteps.map((step) => {
            if (isToolPart(step)) {
              if (isTaskTool(step)) {
                return (
                  <TaskToolStep
                    key={step.id}
                    part={step}
                    onOpenSession={onOpenSession}
                  />
                );
              }
              return <ToolCallStep key={step.id} part={step} />;
            }
            return <ReasoningStep key={step.id} part={step} />;
          })}
        </div>
      )}

      {allTextParts.map((part, i) => (
        <div key={part.id || i} className={styles.messageContent}>
          <Markdown>{part.text}</Markdown>
        </div>
      ))}

      {hasError &&
        errorMessage &&
        isAssistantMessage(errorMessage.info) &&
        errorMessage.info.error && (
          <div className={styles.messageError}>
            {'data' in errorMessage.info.error && errorMessage.info.error.data
              ? (errorMessage.info.error.data as { message?: string })
                  .message || __('Error', 'wordforge')
              : __('Error', 'wordforge')}
          </div>
        )}
    </div>
  );
};

interface SessionTurnProps {
  turn: MessageTurn;
  onOpenSession?: (sessionId: string) => void;
}

const SessionTurn = ({ turn, onOpenSession }: SessionTurnProps) => {
  return (
    <div className={styles.turn}>
      <UserMessageBlock message={turn.userMessage} />
      <AssistantResponseBlock
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
