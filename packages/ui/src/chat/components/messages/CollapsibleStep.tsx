import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';

export type StepStatus = 'pending' | 'running' | 'completed' | 'error';

interface CollapsibleStepProps {
  title: string;
  subtitle?: string;
  status?: StepStatus;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const STATUS_LABELS: Record<StepStatus, string> = {
  pending: __('Pending', 'wordforge'),
  running: __('Running', 'wordforge'),
  completed: __('Completed', 'wordforge'),
  error: __('Failed', 'wordforge'),
};

export const CollapsibleStep = ({
  title,
  subtitle,
  status,
  defaultExpanded = false,
  children,
}: CollapsibleStepProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

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
            {STATUS_LABELS[status]}
          </span>
        )}
        <span className={styles.stepExpander}>{expanded ? '-' : '+'}</span>
      </button>
      {expanded && <div className={styles.stepBody}>{children}</div>}
    </div>
  );
};
