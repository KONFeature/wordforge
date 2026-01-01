import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import type { StepStatus } from './CollapsibleStep';
import type { ToolPart } from './types';
import { getTaskSessionId } from './types';

interface TaskToolStepProps {
  part: ToolPart;
  onOpenSession?: (sessionId: string) => void;
}

const STATUS_LABELS: Record<StepStatus, string> = {
  pending: __('Pending', 'wordforge'),
  running: __('Running', 'wordforge'),
  completed: __('Completed', 'wordforge'),
  error: __('Failed', 'wordforge'),
};

export const TaskToolStep = ({ part, onOpenSession }: TaskToolStepProps) => {
  const state = part.state;
  const status = state.status;
  const title =
    ('title' in state && state.title) || __('Sub-agent Task', 'wordforge');
  const sessionId = getTaskSessionId(part);

  const handleOpenSession = () => {
    if (sessionId && onOpenSession) {
      onOpenSession(sessionId);
    }
  };

  return (
    <div className={`${styles.taskStep} ${styles[status]}`}>
      <div className={styles.taskStepHeader}>
        {status === 'running' || status === 'pending' ? <Spinner /> : null}
        <span className={styles.taskStepIcon}>&#129302;</span>
        <span className={styles.taskStepTitle}>{title}</span>
        <span className={`${styles.taskStepStatus} ${styles[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      {sessionId && onOpenSession && (
        <button
          type="button"
          className={styles.taskStepLink}
          onClick={handleOpenSession}
        >
          {__('View Session', 'wordforge')} &rarr;
        </button>
      )}
    </div>
  );
};
