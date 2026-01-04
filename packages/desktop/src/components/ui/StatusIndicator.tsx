import { type HTMLAttributes, forwardRef } from 'react';
import styles from './StatusIndicator.module.css';

export type StatusIndicatorStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'idle'
  | 'loading';

export interface StatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  status: StatusIndicatorStatus;
  label?: string;
  showPulse?: boolean;
}

export const StatusIndicator = forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, label, showPulse = false, className, ...props }, ref) => {
    const shouldPulse = showPulse || status === 'loading';

    const classNames = [styles.container, className].filter(Boolean).join(' ');

    const dotClassNames = [
      styles.dot,
      styles[status],
      shouldPulse && styles.pulse,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        <span className={dotClassNames} />
        {label && <span className={styles.label}>{label}</span>}
      </div>
    );
  },
);

StatusIndicator.displayName = 'StatusIndicator';
