import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import type { CompactionPart } from './types';

interface CompactionNoticeProps {
  part: CompactionPart;
}

export const CompactionNotice = ({ part }: CompactionNoticeProps) => {
  return (
    <div className={styles.compactionNotice}>
      <span className={styles.compactionIcon}>📦</span>
      <span className={styles.compactionText}>
        {part.auto
          ? __('Context was automatically compacted', 'wordforge')
          : __('Context was compacted', 'wordforge')}
      </span>
    </div>
  );
};
