import { Button, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { ServerStatus } from '../hooks/useServerStatus';
import styles from './ServerStatusBanner.module.css';

interface ServerStatusBannerProps {
  status: ServerStatus;
  onAutoStart: () => void;
  isStarting: boolean;
  error?: string | null;
}

export const ServerStatusBanner = ({
  status,
  onAutoStart,
  isStarting,
  error,
}: ServerStatusBannerProps) => {
  if (status.running) {
    return null;
  }

  const needsDownload = !status.binaryInstalled;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>{needsDownload ? '📦' : '⚡'}</div>
        <div className={styles.text}>
          <p className={styles.title}>
            {needsDownload
              ? __('OpenCode not installed', 'wordforge')
              : __('OpenCode server stopped', 'wordforge')}
          </p>
          <p className={styles.description}>
            {needsDownload
              ? __(
                  'Download and start OpenCode to begin chatting.',
                  'wordforge',
                )
              : __('Start the server to continue.', 'wordforge')}
          </p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Button
        variant="primary"
        onClick={onAutoStart}
        disabled={isStarting}
        className={styles.button}
      >
        {isStarting ? (
          <>
            <Spinner />
            <span>
              {needsDownload
                ? __('Downloading...', 'wordforge')
                : __('Starting...', 'wordforge')}
            </span>
          </>
        ) : needsDownload ? (
          __('Download & Start', 'wordforge')
        ) : (
          __('Start Server', 'wordforge')
        )}
      </Button>
    </div>
  );
};
