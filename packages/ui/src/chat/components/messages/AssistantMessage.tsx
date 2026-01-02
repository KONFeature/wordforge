import { memo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import { Markdown } from './Markdown';
import { ReasoningStep } from './ReasoningStep';
import { TaskToolStep } from './TaskToolStep';
import { ToolCallStep } from './ToolCallStep';
import type { ChatMessage, Part, ReasoningPart, ToolPart } from './types';
import {
  isAssistantMessage,
  isReasoningPart,
  isTaskTool,
  isTextPart,
  isToolPart,
} from './types';

interface AssistantMessageProps {
  messages: ChatMessage[];
  onOpenSession?: (sessionId: string) => void;
}

export const AssistantMessage = memo(
  ({ messages, onOpenSession }: AssistantMessageProps) => {
    if (!messages || messages.length === 0) return null;

    const allParts: Part[] = messages.flatMap((m) => m.parts || []);
    const validParts = allParts.filter((p): p is Part => p != null);
    const allSteps = validParts.filter(
      (p) => isToolPart(p) || isReasoningPart(p),
    ) as (ToolPart | ReasoningPart)[];
    const allTextParts = validParts.filter(isTextPart);

    const firstMsg = messages[0];
    if (!firstMsg?.info) return null;

    const modelInfo = isAssistantMessage(firstMsg.info)
      ? { provider: firstMsg.info.providerID, model: firstMsg.info.modelID }
      : null;

    const agentName = isAssistantMessage(firstMsg.info)
      ? (firstMsg.info.mode ?? (firstMsg.info as { agent?: string }).agent)
      : null;

    const createdTime = firstMsg.info.time?.created;
    const time = createdTime
      ? new Date(createdTime * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

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
              &#129302; {modelInfo.provider}/{modelInfo.model}
            </span>
          )}
          {agentName && (
            <span className={styles.messageAgent}>{agentName}</span>
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
  },
);
