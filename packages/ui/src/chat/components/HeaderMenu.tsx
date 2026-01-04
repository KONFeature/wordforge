import type { AssistantMessage, Provider } from '@opencode-ai/sdk/v2';
import { DropdownMenu, MenuGroup, MenuItem } from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { search, file, code, backup, trash } from '@wordpress/icons';
import { useClient } from '../../lib/ClientProvider';
import type { ConnectionMode } from '../../lib/openCodeClient';
import type { ExportFormat } from '../hooks/useExport';
import styles from './HeaderMenu.module.css';
import type { ChatMessage } from './MessageList';
import { isAssistantMessage } from './messages/index';

interface HeaderMenuProps {
  hasSession: boolean;
  hasMessages: boolean;
  isBusy: boolean;
  messages: ChatMessage[];
  providers: Provider[];
  showSearch?: boolean;
  onToggleSearch?: () => void;
  onExport?: (format: ExportFormat) => void;
  onRefresh: () => void;
  onDelete: () => void;
}

const formatCost = (cost: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
  }).format(cost);
};

const getConnectionLabel = (mode: ConnectionMode): string => {
  switch (mode) {
    case 'local':
      return __('Local OpenCode', 'wordforge');
    case 'remote':
      return __('WP Server', 'wordforge');
    default:
      return __('Disconnected', 'wordforge');
  }
};

const getAlternativeLabel = (mode: ConnectionMode): string => {
  if (mode === 'local') {
    return __('Switch to WP Server', 'wordforge');
  }
  return __('Switch to Local OpenCode', 'wordforge');
};

export const HeaderMenu = ({
  hasSession,
  hasMessages,
  isBusy,
  messages,
  providers,
  showSearch,
  onToggleSearch,
  onExport,
  onRefresh,
  onDelete,
}: HeaderMenuProps) => {
  const { connectionStatus, setPreference } = useClient();
  const { mode, localAvailable, remoteAvailable } = connectionStatus;

  const canSwitch =
    (mode === 'local' && remoteAvailable) ||
    (mode === 'remote' && localAvailable);

  const handleSwitch = () => {
    if (mode === 'local' && remoteAvailable) {
      setPreference('remote');
    } else if (mode === 'remote' && localAvailable) {
      setPreference('local');
    }
  };

  const stats = useMemo(() => {
    const assistantMsg = messages.filter((m) => isAssistantMessage(m.info));
    const lastAssistantMsg = assistantMsg[assistantMsg.length - 1]?.info as
      | AssistantMessage
      | undefined;

    const totalCost = messages.reduce((sum, m) => {
      if (isAssistantMessage(m.info)) {
        return sum + ((m.info as AssistantMessage).cost || 0);
      }
      return sum;
    }, 0);

    if (!lastAssistantMsg) {
      if (totalCost > 0) {
        return {
          tokens: '0',
          percentage: null,
          formattedCost: formatCost(totalCost),
        };
      }
      return null;
    }

    const t = lastAssistantMsg.tokens;
    const totalTokens =
      (t?.input ?? 0) +
      (t?.output ?? 0) +
      (t?.reasoning ?? 0) +
      (t?.cache?.read || 0) +
      (t?.cache?.write || 0);

    const provider = providers.find(
      (p) => p.id === lastAssistantMsg.providerID,
    );
    const model = Object.values(provider?.models ?? {}).find(
      (m) => m.id === lastAssistantMsg.modelID,
    );

    const contextLimit = model?.limit?.context || 0;
    const percentage =
      contextLimit > 0 ? Math.round((totalTokens / contextLimit) * 100) : null;

    return {
      tokens: totalTokens.toLocaleString(),
      percentage,
      formattedCost: formatCost(totalCost),
    };
  }, [messages, providers]);

  return (
    <DropdownMenu
      icon="ellipsis"
      label={__('More options', 'wordforge')}
      toggleProps={{ size: 'small' }}
    >
      {({ onClose }) => (
        <>
          {hasSession && (
            <MenuGroup label={__('Actions', 'wordforge')}>
              {onToggleSearch && hasMessages && (
                <MenuItem
                  icon={search}
                  onClick={() => {
                    onToggleSearch();
                    onClose();
                  }}
                >
                  {showSearch
                    ? __('Hide search', 'wordforge')
                    : __('Search messages', 'wordforge')}
                </MenuItem>
              )}
              {onExport && hasMessages && (
                <>
                  <MenuItem
                    icon={file}
                    onClick={() => {
                      onExport('markdown');
                      onClose();
                    }}
                    disabled={isBusy}
                  >
                    {__('Export as Markdown', 'wordforge')}
                  </MenuItem>
                  <MenuItem
                    icon={code}
                    onClick={() => {
                      onExport('json');
                      onClose();
                    }}
                    disabled={isBusy}
                  >
                    {__('Export as JSON', 'wordforge')}
                  </MenuItem>
                </>
              )}
              <MenuItem
                icon={backup}
                onClick={() => {
                  onRefresh();
                  onClose();
                }}
              >
                {__('Refresh', 'wordforge')}
              </MenuItem>
              <MenuItem
                icon={trash}
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                isDestructive
              >
                {__('Delete session', 'wordforge')}
              </MenuItem>
            </MenuGroup>
          )}

          {stats && (
            <MenuGroup label={__('Context', 'wordforge')}>
              <div className={styles.contextSection}>
                <div className={styles.contextRow}>
                  <span className={styles.contextLabel}>
                    {__('Tokens', 'wordforge')}
                  </span>
                  <span className={styles.contextValue}>{stats.tokens}</span>
                </div>
                {stats.percentage !== null && (
                  <div className={styles.contextRow}>
                    <span className={styles.contextLabel}>
                      {__('Context used', 'wordforge')}
                    </span>
                    <span
                      className={`${styles.contextValue} ${
                        stats.percentage >= 80
                          ? styles.high
                          : stats.percentage >= 50
                            ? styles.medium
                            : ''
                      }`}
                    >
                      {stats.percentage}%
                    </span>
                  </div>
                )}
                <div className={styles.contextRow}>
                  <span className={styles.contextLabel}>
                    {__('Cost', 'wordforge')}
                  </span>
                  <span className={styles.contextValue}>
                    {stats.formattedCost}
                  </span>
                </div>
              </div>
            </MenuGroup>
          )}

          <MenuGroup label={__('Connection', 'wordforge')}>
            <div className={styles.connectionSection}>
              <div className={styles.connectionStatus}>
                <span
                  className={`${styles.connectionDot} ${
                    mode === 'local'
                      ? styles.dotLocal
                      : mode === 'remote'
                        ? styles.dotRemote
                        : styles.dotDisconnected
                  }`}
                />
                <span className={styles.connectionLabel}>
                  {getConnectionLabel(mode)}
                </span>
              </div>

              {mode !== 'disconnected' && (
                <div className={styles.availabilityInfo}>
                  {mode === 'local' && (
                    <span
                      className={
                        remoteAvailable ? styles.available : styles.unavailable
                      }
                    >
                      {remoteAvailable
                        ? __('WP Server available', 'wordforge')
                        : __('WP Server offline', 'wordforge')}
                    </span>
                  )}
                  {mode === 'remote' && (
                    <span
                      className={
                        localAvailable ? styles.available : styles.unavailable
                      }
                    >
                      {localAvailable
                        ? __('Local OpenCode available', 'wordforge')
                        : __('Local OpenCode offline', 'wordforge')}
                    </span>
                  )}
                </div>
              )}

              {canSwitch && (
                <button
                  type="button"
                  className={styles.switchButton}
                  onClick={() => {
                    handleSwitch();
                    onClose();
                  }}
                >
                  {getAlternativeLabel(mode)}
                </button>
              )}
            </div>
          </MenuGroup>
        </>
      )}
    </DropdownMenu>
  );
};
