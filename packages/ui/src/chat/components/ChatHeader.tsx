import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './ChatHeader.module.css';

interface ChatHeaderProps {
  title: string;
  isBusy: boolean;
  hasSession: boolean;
  compact?: boolean;
  onRefresh: () => void;
  onDelete: () => void;
  onToggleSessions?: () => void;
  sessionsCollapsed?: boolean;
}

export const ChatHeader = ({
  title,
  isBusy,
  hasSession,
  compact = false,
  onRefresh,
  onDelete,
  onToggleSessions,
  sessionsCollapsed,
}: ChatHeaderProps) => {
  const rootClass = compact ? `${styles.root} ${styles.compact}` : styles.root;

  return (
    <div className={rootClass}>
      <div className={styles.left}>
        {compact && onToggleSessions && (
          <Button
            icon={sessionsCollapsed ? 'menu' : 'no-alt'}
            label={
              sessionsCollapsed
                ? __('Show sessions', 'wordforge')
                : __('Hide sessions', 'wordforge')
            }
            onClick={onToggleSessions}
            className={styles.menuButton}
            isSmall
          />
        )}
        <span className={styles.title}>{title}</span>
        {hasSession && (
          <span
            className={`${styles.statusBadge} ${isBusy ? styles.busy : styles.ready}`}
          >
            {isBusy ? __('Busy', 'wordforge') : __('Ready', 'wordforge')}
          </span>
        )}
      </div>
      <div className={styles.right}>
        {hasSession && (
          <>
            <Button
              icon="update"
              label={__('Refresh', 'wordforge')}
              onClick={onRefresh}
              isSmall
            />
            <Button
              icon="trash"
              label={__('Delete Session', 'wordforge')}
              onClick={onDelete}
              isSmall
              isDestructive
            />
          </>
        )}
      </div>
    </div>
  );
};
