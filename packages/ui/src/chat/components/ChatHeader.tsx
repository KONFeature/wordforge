import type { Provider } from '@opencode-ai/sdk/v2';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { ExportFormat } from '../hooks/useExport';
import styles from './ChatHeader.module.css';
import { HeaderMenu } from './HeaderMenu';
import type { ChatMessage } from './MessageList';
import { StatusIndicator } from './StatusIndicator';

interface ParentSessionInfo {
  id: string;
  title: string;
}

interface ChatHeaderProps {
  title: string;
  isBusy: boolean;
  hasSession: boolean;
  hasMessages: boolean;
  messages: ChatMessage[];
  providers: Provider[];
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
  messages,
  providers,
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
          <StatusIndicator />
        </div>
        <div className={styles.right}>
          <HeaderMenu
            hasSession={hasSession}
            hasMessages={hasMessages}
            isBusy={isBusy}
            messages={messages}
            providers={providers}
            showSearch={showSearch}
            onToggleSearch={onToggleSearch}
            onExport={onExport}
            onRefresh={onRefresh}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};
