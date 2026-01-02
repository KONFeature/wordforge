import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import type { PatchPart } from './types';

interface PatchStepProps {
  part: PatchPart;
}

export const PatchStep = ({ part }: PatchStepProps) => {
  const files = part.files || [];

  if (files.length === 0) return null;

  return (
    <div className={styles.patchStep}>
      <span className={styles.patchIcon}>📝</span>
      <span className={styles.patchLabel}>
        {__('Modified', 'wordforge')} {files.length}{' '}
        {files.length === 1
          ? __('file', 'wordforge')
          : __('files', 'wordforge')}
      </span>
      <span className={styles.patchFiles}>{files.join(', ')}</span>
    </div>
  );
};
