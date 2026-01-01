import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { ExportFormat } from '../hooks/useExport';
import styles from './ChatHeader.module.css';
import { ExportMenu } from './ExportMenu';

interface ParentSessionInfo {
  id: string;
  title: string;
}

interface ChatHeaderProps {
  title: string;
  isBusy: boolean;
  hasSession: boolean;
  hasMessages: boolean;
  compact?: boolean;
  parentSession?: ParentSessionInfo | null;
  onRefresh: () => void;
  onDelete: () => void;
  onToggleSessions?: () => void;
  onBackToParent?: () => void;
  onToggleSearch?: () => void;
  onExport?: (format: ExportFormat) => void;
  sessionsCollapsed?: boolean;
  showSearch?: boolean;
}

export const ChatHeader = ({
  title,
  isBusy,
  hasSession,
  hasMessages,
  compact = false,
  parentSession,
  onRefresh,
  onDelete,
  onToggleSessions,
  onBackToParent,
  onToggleSearch,
  onExport,
  sessionsCollapsed,
  showSearch,
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
              size="small"
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
              {onToggleSearch && hasMessages && (
                <Button
                  icon="search"
                  label={__('Search messages', 'wordforge')}
                  onClick={onToggleSearch}
                  size="small"
                  isPressed={showSearch}
                />
              )}
              {onExport && hasMessages && (
                <ExportMenu onExport={onExport} disabled={isBusy} />
              )}
              <Button
                icon="update"
                label={__('Refresh', 'wordforge')}
                onClick={onRefresh}
                size="small"
              />
              <Button
                icon="trash"
                label={__('Delete Session', 'wordforge')}
                onClick={onDelete}
                size="small"
                isDestructive
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
