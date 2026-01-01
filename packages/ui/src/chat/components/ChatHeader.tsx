import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './ChatHeader.module.css';

interface ParentSessionInfo {
  id: string;
  title: string;
}

interface ChatHeaderProps {
  title: string;
  isBusy: boolean;
  hasSession: boolean;
  compact?: boolean;
  parentSession?: ParentSessionInfo | null;
  onRefresh: () => void;
  onDelete: () => void;
  onToggleSessions?: () => void;
  onBackToParent?: () => void;
  sessionsCollapsed?: boolean;
}

export const ChatHeader = ({
  title,
  isBusy,
  hasSession,
  compact = false,
  parentSession,
  onRefresh,
  onDelete,
  onToggleSessions,
  onBackToParent,
  sessionsCollapsed,
}: ChatHeaderProps) => {
  const rootClass = compact ? `${styles.root} ${styles.compact}` : styles.root;

  return (
    <div className={rootClass}>
      {parentSession && onBackToParent && (
        <button
          type="button"
          className={styles.parentBanner}
          onClick={onBackToParent}
        >
          <span className={styles.parentBannerIcon}>←</span>
          <span className={styles.parentBannerText}>
            {__('Back to', 'wordforge')}{' '}
            <strong>
              {parentSession.title || __('Parent Session', 'wordforge')}
            </strong>
          </span>
        </button>
      )}
      <div className={styles.headerMain}>
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
    </div>
  );
};
