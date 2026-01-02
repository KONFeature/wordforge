import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import type { SubtaskPart } from './types';

interface SubtaskStepProps {
  part: SubtaskPart;
}

export const SubtaskStep = ({ part }: SubtaskStepProps) => {
  return (
    <div className={styles.subtaskStep}>
      <div className={styles.subtaskHeader}>
        <span className={styles.subtaskIcon}>📋</span>
        <span className={styles.subtaskLabel}>
          {__('Subtask', 'wordforge')}
        </span>
        {part.agent && (
          <span className={styles.subtaskAgent}>{part.agent}</span>
        )}
      </div>
      <div className={styles.subtaskDescription}>{part.description}</div>
    </div>
  );
};
