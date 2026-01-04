import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';

interface CollapsibleStepsProps {
  children: React.ReactNode;
  isComplete: boolean;
  durationSeconds?: number;
  stepCount?: number;
}

export const CollapsibleSteps = ({
  children,
  isComplete,
  durationSeconds,
}: CollapsibleStepsProps) => {
  const [expanded, setExpanded] = useState(!isComplete);

  const durationText = useMemo(() => {
    if (durationSeconds === undefined || durationSeconds < 1) return null;
    if (durationSeconds < 60) {
      return `${Math.round(durationSeconds)}s`;
    }
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.round(durationSeconds % 60);
    return `${minutes}m ${seconds}s`;
  }, [durationSeconds]);

  if (!isComplete) {
    return <div className={styles.stepsContainer}>{children}</div>;
  }

  return (
    <div className={styles.collapsibleStepsWrapper}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={styles.collapsibleStepsToggle}
        aria-expanded={expanded}
      >
        <span className={styles.collapsibleStepsLabel}>
          {expanded
            ? __('Hide steps', 'wordforge')
            : __('Show steps', 'wordforge')}
          {durationText && (
            <span className={styles.collapsibleStepsDuration}>
              {' '}
              · {durationText}
            </span>
          )}
        </span>
        <span
          className={`${styles.collapsibleStepsChevron} ${expanded ? styles.expanded : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {expanded && <div className={styles.stepsContainer}>{children}</div>}
    </div>
  );
};
