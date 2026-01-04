import { memo, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import { AgentBadge } from './AgentBadge';
import { CollapsibleSteps } from './CollapsibleSteps';
import { CompactionNotice } from './CompactionNotice';
import { FileAttachment } from './FileAttachment';
import { Markdown } from './Markdown';
import { PatchStep } from './PatchStep';
import { ReasoningStep } from './ReasoningStep';
import { RetryStep } from './RetryStep';
import { SubtaskStep } from './SubtaskStep';
import { TaskToolStep } from './TaskToolStep';
import { ToolCallStep } from './ToolCallStep';
import type {
  AgentPart,
  ChatMessage,
  CompactionPart,
  FilePart,
  Part,
  PatchPart,
  ReasoningPart,
  RetryPart,
  StepFinishPart,
  SubtaskPart,
  ToolPart,
} from './types';
import {
  isAgentPart,
  isAssistantMessage,
  isCompactionPart,
  isFilePart,
  isPatchPart,
  isReasoningPart,
  isRetryPart,
  isStepFinishPart,
  isSubtaskPart,
  isTaskTool,
  isTextPart,
  isToolPart,
} from './types';

interface AssistantMessageProps {
  messages: ChatMessage[];
  isComplete: boolean;
  onOpenSession?: (sessionId: string) => void;
}

type StepPart = ToolPart | ReasoningPart | PatchPart | RetryPart | SubtaskPart;

export const AssistantMessage = memo(
  ({ messages, isComplete, onOpenSession }: AssistantMessageProps) => {
    if (!messages || messages.length === 0) return null;

    const allParts: Part[] = messages.flatMap((m) => m.parts || []);
    const validParts = allParts.filter((p): p is Part => p != null);

    const durationSeconds = useMemo(() => {
      if (!isComplete || messages.length === 0) return undefined;
      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];
      const startTime =
        isAssistantMessage(firstMsg.info) && firstMsg.info.time?.created
          ? firstMsg.info.time.created
          : undefined;
      const endTime =
        isAssistantMessage(lastMsg.info) && lastMsg.info.time?.completed
          ? lastMsg.info.time.completed
          : undefined;
      if (startTime && endTime) {
        return endTime - startTime;
      }
      return undefined;
    }, [messages, isComplete]);

    const allSteps = validParts.filter(
      (p): p is StepPart =>
        isToolPart(p) ||
        isReasoningPart(p) ||
        isPatchPart(p) ||
        isRetryPart(p) ||
        isSubtaskPart(p),
    );
    const allTextParts = validParts.filter(isTextPart);
    const fileParts = validParts.filter(isFilePart) as FilePart[];
    const agentParts = validParts.filter(isAgentPart) as AgentPart[];
    const compactionParts = validParts.filter(
      isCompactionPart,
    ) as CompactionPart[];

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

        {agentParts.length > 0 &&
          agentParts.map((part) => <AgentBadge key={part.id} part={part} />)}

        {compactionParts.length > 0 &&
          compactionParts.map((part) => (
            <CompactionNotice key={part.id} part={part} />
          ))}

        {allSteps.length > 0 && (
          <CollapsibleSteps
            isComplete={isComplete}
            durationSeconds={durationSeconds}
            stepCount={allSteps.length}
          >
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
              if (isPatchPart(step)) {
                return <PatchStep key={step.id} part={step} />;
              }
              if (isRetryPart(step)) {
                return <RetryStep key={step.id} part={step} />;
              }
              if (isSubtaskPart(step)) {
                return <SubtaskStep key={step.id} part={step} />;
              }
              return <ReasoningStep key={step.id} part={step} />;
            })}
          </CollapsibleSteps>
        )}

        {allTextParts.map((part, i) => (
          <div key={part.id || i} className={styles.messageContent}>
            <Markdown>{part.text}</Markdown>
          </div>
        ))}

        {fileParts.length > 0 &&
          fileParts.map((part) => <FileAttachment key={part.id} part={part} />)}

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
