import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  SelectControl,
  ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
  formatDuration,
  THRESHOLD_OPTIONS,
  useAutoShutdownSettings,
  useSaveAutoShutdown,
} from '../hooks/useAutoShutdown';
import { useServerAction } from '../hooks/useServerActions';
import styles from './StatusCard.module.css';

interface StatusCardProps {
  status: {
    mcpAdapter: boolean;
    woocommerce: boolean;
    pluginVersion: string;
    binary: {
      is_installed: boolean;
      version: string;
      os: string;
      arch: string;
    };
    server: {
      running: boolean;
      port: number;
    };
  };
  onStatusChange: () => void;
}

export const StatusCard = ({ status, onStatusChange }: StatusCardProps) => {
  const serverAction = useServerAction(onStatusChange);
  const { data: autoShutdown } = useAutoShutdownSettings();
  const saveAutoShutdown = useSaveAutoShutdown();

  const getStatusMessage = () => {
    if (serverAction.isSuccess) {
      const action = serverAction.data;
      if (action === 'download') return __('Downloaded!', 'wordforge');
      if (action === 'start') return __('Started!', 'wordforge');
      if (action === 'refresh') return __('Context refreshed!', 'wordforge');
      return __('Stopped!', 'wordforge');
    }
    if (serverAction.isPending) {
      if (serverAction.variables === 'download')
        return __('Downloading...', 'wordforge');
      if (serverAction.variables === 'start')
        return __('Starting...', 'wordforge');
      if (serverAction.variables === 'refresh')
        return __('Refreshing context...', 'wordforge');
      return __('Stopping...', 'wordforge');
    }
    if (serverAction.isError) {
      const error = serverAction.error;
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    return null;
  };

  const message = getStatusMessage();

  const renderHeaderActions = () => {
    if (!status.binary.is_installed) {
      return (
        <Button
          variant="primary"
          onClick={() => serverAction.mutate('download')}
          isBusy={serverAction.isPending}
          disabled={serverAction.isPending}
          icon="download"
          size="compact"
        >
          {__('Download OpenCode', 'wordforge')}
        </Button>
      );
    }

    if (status.server.running) {
      return (
        <>
          <Button
            variant="primary"
            href="admin.php?page=wordforge-chat"
            icon="format-chat"
            size="compact"
          >
            {__('Open Chat', 'wordforge')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => serverAction.mutate('refresh')}
            isBusy={
              serverAction.isPending && serverAction.variables === 'refresh'
            }
            disabled={serverAction.isPending}
            icon="update"
            size="compact"
          >
            {__('Refresh', 'wordforge')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => serverAction.mutate('stop')}
            isBusy={serverAction.isPending && serverAction.variables === 'stop'}
            disabled={serverAction.isPending}
            icon="controls-pause"
            size="compact"
          >
            {__('Stop', 'wordforge')}
          </Button>
        </>
      );
    }

    return (
      <Button
        variant="primary"
        onClick={() => serverAction.mutate('start')}
        isBusy={serverAction.isPending}
        disabled={serverAction.isPending}
        icon="controls-play"
        size="compact"
      >
        {__('Start Server', 'wordforge')}
      </Button>
    );
  };

  return (
    <Card className="wordforge-card">
      <CardHeader className={styles.header}>
        <h2>{__('WordForge Status', 'wordforge')}</h2>
        <div className={styles.headerActions}>
          {renderHeaderActions()}
          {message && <span className={styles.message}>{message}</span>}
        </div>
      </CardHeader>
      <CardBody>
        <div className={styles.dashboard}>
          <div className={styles.statGroup}>
            <h3 className={styles.groupTitle}>
              {__('Integrations', 'wordforge')}
            </h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <Icon
                  icon={status.mcpAdapter ? 'yes-alt' : 'warning'}
                  className={
                    status.mcpAdapter ? styles.iconSuccess : styles.iconError
                  }
                />
                <span className={styles.statLabel}>
                  {__('MCP Adapter', 'wordforge')}
                </span>
                <span
                  className={`${styles.badge} ${status.mcpAdapter ? styles.success : styles.error}`}
                >
                  {status.mcpAdapter
                    ? __('Active', 'wordforge')
                    : __('Not Found', 'wordforge')}
                </span>
              </div>
              <div className={styles.stat}>
                <Icon
                  icon={status.woocommerce ? 'yes-alt' : 'minus'}
                  className={
                    status.woocommerce ? styles.iconSuccess : styles.iconMuted
                  }
                />
                <span className={styles.statLabel}>
                  {__('WooCommerce', 'wordforge')}
                </span>
                <span
                  className={`${styles.badge} ${status.woocommerce ? styles.success : styles.muted}`}
                >
                  {status.woocommerce
                    ? __('Active', 'wordforge')
                    : __('Not Installed', 'wordforge')}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.statGroup}>
            <h3 className={styles.groupTitle}>
              {__('OpenCode AI', 'wordforge')}
            </h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <Icon
                  icon={status.binary.is_installed ? 'yes-alt' : 'download'}
                  className={
                    status.binary.is_installed
                      ? styles.iconSuccess
                      : styles.iconMuted
                  }
                />
                <span className={styles.statLabel}>
                  {__('Binary', 'wordforge')}
                </span>
                {status.binary.is_installed ? (
                  <code className={styles.version}>
                    {status.binary.version}
                  </code>
                ) : (
                  <span className={`${styles.badge} ${styles.muted}`}>
                    {__('Not Installed', 'wordforge')}
                  </span>
                )}
              </div>
              <div className={styles.stat}>
                <Icon
                  icon={status.server.running ? 'yes-alt' : 'controls-pause'}
                  className={
                    status.server.running
                      ? styles.iconSuccess
                      : styles.iconMuted
                  }
                />
                <span className={styles.statLabel}>
                  {__('Server', 'wordforge')}
                </span>
                {status.server.running ? (
                  <code className={styles.version}>
                    port {status.server.port}
                  </code>
                ) : (
                  <span className={`${styles.badge} ${styles.muted}`}>
                    {__('Stopped', 'wordforge')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.statGroup}>
            <h3 className={styles.groupTitle}>{__('System', 'wordforge')}</h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <Icon icon="wordpress" className={styles.iconMuted} />
                <span className={styles.statLabel}>
                  {__('Plugin', 'wordforge')}
                </span>
                <code className={styles.version}>{status.pluginVersion}</code>
              </div>
              <div className={styles.stat}>
                <Icon icon="laptop" className={styles.iconMuted} />
                <span className={styles.statLabel}>
                  {__('Platform', 'wordforge')}
                </span>
                <code className={styles.version}>
                  {status.binary.os}-{status.binary.arch}
                </code>
              </div>
            </div>
          </div>

          <div className={styles.statGroup}>
            <h3 className={styles.groupTitle}>
              {__('Auto-Shutdown', 'wordforge')}
            </h3>
            <div className={styles.autoShutdown}>
              <ToggleControl
                label={__('Stop server when idle', 'wordforge')}
                checked={autoShutdown?.enabled ?? true}
                onChange={(enabled) => saveAutoShutdown.mutate({ enabled })}
                disabled={saveAutoShutdown.isPending}
                __nextHasNoMarginBottom
              />
              {autoShutdown?.enabled && (
                <SelectControl
                  label={__('Idle timeout', 'wordforge')}
                  value={String(autoShutdown?.threshold ?? 1800)}
                  options={THRESHOLD_OPTIONS.map((opt) => ({
                    value: String(opt.value),
                    label: opt.label,
                  }))}
                  onChange={(value) =>
                    saveAutoShutdown.mutate({ threshold: Number(value) })
                  }
                  disabled={saveAutoShutdown.isPending}
                  __nextHasNoMarginBottom
                />
              )}
              {status.server.running &&
                autoShutdown?.enabled &&
                autoShutdown?.activity?.will_shutdown_in != null && (
                  <p className={styles.shutdownInfo}>
                    {__('Shutting down in', 'wordforge')}{' '}
                    <strong>
                      {formatDuration(autoShutdown.activity.will_shutdown_in)}
                    </strong>
                  </p>
                )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
