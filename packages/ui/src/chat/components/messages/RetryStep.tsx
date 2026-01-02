import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import type { RetryPart } from './types';

interface RetryStepProps {
  part: RetryPart;
}

export const RetryStep = ({ part }: RetryStepProps) => {
  const errorMessage =
    part.error && typeof part.error === 'object' && 'message' in part.error
      ? (part.error as { message?: string }).message
      : __('Unknown error', 'wordforge');

  return (
    <div className={styles.retryStep}>
      <span className={styles.retryIcon}>🔄</span>
      <span className={styles.retryLabel}>
        {__('Retry attempt', 'wordforge')} #{part.attempt}
      </span>
      {errorMessage && (
        <span className={styles.retryError}>{errorMessage}</span>
      )}
    </div>
  );
};
