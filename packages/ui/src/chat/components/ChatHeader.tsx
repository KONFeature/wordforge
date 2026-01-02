import { Button, Tooltip } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useClientOptional } from '../../lib/ClientProvider';
import type { ConnectionMode } from '../../lib/openCodeClient';
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

const getConnectionLabel = (mode: ConnectionMode): string => {
  switch (mode) {
    case 'local':
      return __('Local', 'wordforge');
    case 'remote':
      return __('Server', 'wordforge');
    default:
      return __('Disconnected', 'wordforge');
  }
};

const getConnectionTooltip = (
  mode: ConnectionMode,
  localAvailable: boolean,
  remoteAvailable: boolean,
): string => {
  if (mode === 'local') {
    return remoteAvailable
      ? __(
          'Connected to local OpenCode. Click to switch to server.',
          'wordforge',
        )
      : __('Connected to local OpenCode.', 'wordforge');
  }
  if (mode === 'remote') {
    return localAvailable
      ? __(
          'Connected to WordPress server. Click to switch to local.',
          'wordforge',
        )
      : __('Connected to WordPress server.', 'wordforge');
  }
  return __(
    'No OpenCode server available. Start the server or run OpenCode locally.',
    'wordforge',
  );
};

const getConnectionStyle = (mode: ConnectionMode): string => {
  switch (mode) {
    case 'local':
      return styles.connectionLocal;
    case 'remote':
      return styles.connectionRemote;
    default:
      return styles.connectionDisconnected;
  }
};

const ConnectionBadge = () => {
  const clientContext = useClientOptional();

  if (!clientContext) {
    return null;
  }

  const { connectionStatus, setPreference } = clientContext;
  const { mode, localAvailable, remoteAvailable, isChecking } =
    connectionStatus;

  if (isChecking) {
    return null;
  }

  const canSwitch =
    (mode === 'local' && remoteAvailable) ||
    (mode === 'remote' && localAvailable);

  const handleClick = () => {
    if (mode === 'local' && remoteAvailable) {
      setPreference('remote');
    } else if (mode === 'remote' && localAvailable) {
      setPreference('local');
    }
  };

  const badge = (
    <button
      type="button"
      className={`${styles.connectionBadge} ${getConnectionStyle(mode)}`}
      onClick={canSwitch ? handleClick : undefined}
      disabled={!canSwitch}
      style={!canSwitch ? { cursor: 'default' } : undefined}
    >
      <span className={styles.connectionDot} />
      {getConnectionLabel(mode)}
    </button>
  );

  return (
    <Tooltip text={getConnectionTooltip(mode, localAvailable, remoteAvailable)}>
      {badge}
    </Tooltip>
  );
};

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
          <ConnectionBadge />
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
