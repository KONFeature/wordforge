import { Button, Icon, Spinner } from '@wordpress/components';
import { useCallback, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { check, copy, update } from '@wordpress/icons';
import type { ConnectionStatus } from '../../lib/ClientProvider';
import type { ServerStatus } from '../hooks/useServerStatus';
import styles from './ConnectionBanner.module.css';

interface ConnectionBannerProps {
  connectionStatus: ConnectionStatus;
  serverStatus?: ServerStatus | null;
  onStartRemoteServer?: () => void;
  isStartingRemote?: boolean;
  remoteError?: string | null;
  siteUrl?: string;
  onRefresh?: () => void;
}

export const ConnectionBanner = ({
  connectionStatus,
  serverStatus,
  onStartRemoteServer,
  isStartingRemote = false,
  remoteError,
  siteUrl,
  onRefresh,
}: ConnectionBannerProps) => {
  const [copiedCommand, setCopiedCommand] = useState(false);

  const localCommand = `opencode serve --port ${connectionStatus.localPort} --cors ${siteUrl ?? window.location.origin}`;

  const handleCopyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(localCommand);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = localCommand;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    }
  }, [localCommand]);

  if (connectionStatus.mode !== 'disconnected') {
    return null;
  }

  const canStartRemote =
    serverStatus?.binaryInstalled &&
    onStartRemoteServer &&
    !serverStatus?.running;
  const needsDownload = serverStatus && !serverStatus.binaryInstalled;

  return (
    <div className={styles.banner}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.icon}>🔌</div>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{__('Not Connected', 'wordforge')}</h3>
            <p className={styles.description}>
              {__(
                'Connect to an OpenCode server to start chatting.',
                'wordforge',
              )}
            </p>
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="tertiary"
            onClick={onRefresh}
            disabled={connectionStatus.isChecking}
            className={styles.refreshButton}
            size="small"
            label={__('Refresh connection status', 'wordforge')}
          >
            {connectionStatus.isChecking ? (
              <Spinner />
            ) : (
              <Icon icon={update} size={18} />
            )}
          </Button>
        )}
      </div>

      {remoteError && <p className={styles.error}>{remoteError}</p>}

      <div className={styles.options}>
        {canStartRemote && (
          <div className={styles.option}>
            <div className={styles.optionHeader}>
              <span className={styles.optionIcon}>🖥️</span>
              <span className={styles.optionTitle}>
                {__('Remote Server', 'wordforge')}
              </span>
            </div>
            <p className={styles.optionDescription}>
              {__('Start OpenCode on your WordPress server.', 'wordforge')}
            </p>
            <Button
              variant="primary"
              onClick={onStartRemoteServer}
              disabled={isStartingRemote}
              className={styles.startButton}
            >
              {isStartingRemote ? (
                <>
                  <Spinner />
                  <span>{__('Starting...', 'wordforge')}</span>
                </>
              ) : (
                __('Start Server', 'wordforge')
              )}
            </Button>
          </div>
        )}

        {needsDownload && onStartRemoteServer && (
          <div className={styles.option}>
            <div className={styles.optionHeader}>
              <span className={styles.optionIcon}>📦</span>
              <span className={styles.optionTitle}>
                {__('Remote Server', 'wordforge')}
              </span>
            </div>
            <p className={styles.optionDescription}>
              {__('Download and install OpenCode on your server.', 'wordforge')}
            </p>
            <Button
              variant="primary"
              onClick={onStartRemoteServer}
              disabled={isStartingRemote}
              className={styles.startButton}
            >
              {isStartingRemote ? (
                <>
                  <Spinner />
                  <span>{__('Downloading...', 'wordforge')}</span>
                </>
              ) : (
                __('Download & Start', 'wordforge')
              )}
            </Button>
          </div>
        )}

        <div className={styles.option}>
          <div className={styles.optionHeader}>
            <span className={styles.optionIcon}>💻</span>
            <span className={styles.optionTitle}>
              {__('Local Server', 'wordforge')}
            </span>
          </div>
          <p className={styles.optionDescription}>
            {__('Run OpenCode on your local machine.', 'wordforge')}
          </p>
          <div className={styles.commandContainer}>
            <button
              type="button"
              className={styles.commandBox}
              onClick={handleCopyCommand}
            >
              <code className={styles.command}>{localCommand}</code>
              <div className={styles.copyIndicator}>
                <Icon icon={copiedCommand ? check : copy} size={16} />
                <span className={styles.copyText}>
                  {copiedCommand
                    ? __('Copied!', 'wordforge')
                    : __('Click to copy', 'wordforge')}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
