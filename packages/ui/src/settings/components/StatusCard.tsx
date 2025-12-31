import { Button, Card, CardBody, CardHeader } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
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

  const getStatusMessage = () => {
    if (serverAction.isSuccess) {
      const action = serverAction.data;
      if (action === 'download') return __('Downloaded!', 'wordforge');
      if (action === 'start') return __('Started!', 'wordforge');
      return __('Stopped!', 'wordforge');
    }
    if (serverAction.isPending) {
      return serverAction.variables === 'download'
        ? __('Downloading...', 'wordforge')
        : serverAction.variables === 'start'
          ? __('Starting...', 'wordforge')
          : __('Stopping...', 'wordforge');
    }
    if (serverAction.isError) {
      const error = serverAction.error;
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    return null;
  };

  const message = getStatusMessage();

  return (
    <Card className="wordforge-card">
      <CardHeader>
        <h2>{__('Status', 'wordforge')}</h2>
      </CardHeader>
      <CardBody>
        <table className={`wordforge-status-table ${styles.table}`}>
          <tbody>
            <tr>
              <td className={styles.tableCell}>
                {__('MCP Adapter', 'wordforge')}
              </td>
              <td>
                {status.mcpAdapter ? (
                  <span className={`${styles.badge} ${styles.success}`}>
                    {__('Active', 'wordforge')}
                  </span>
                ) : (
                  <span className={`${styles.badge} ${styles.error}`}>
                    {__('Not Found', 'wordforge')}
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className={styles.tableCell}>
                {__('WooCommerce', 'wordforge')}
              </td>
              <td>
                {status.woocommerce ? (
                  <span className={`${styles.badge} ${styles.success}`}>
                    {__('Active', 'wordforge')}
                  </span>
                ) : (
                  <span className={`${styles.badge} ${styles.muted}`}>
                    {__('Not Installed', 'wordforge')}
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className={styles.tableCell}>
                {__('Plugin Version', 'wordforge')}
              </td>
              <td>
                <code>{status.pluginVersion}</code>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>{__('OpenCode AI', 'wordforge')}</h3>
        <table className={`wordforge-status-table ${styles.table}`}>
          <tbody>
            <tr>
              <td className={styles.tableCell}>{__('Binary', 'wordforge')}</td>
              <td>
                {status.binary.is_installed ? (
                  <>
                    <span className={`${styles.badge} ${styles.success}`}>
                      {__('Installed', 'wordforge')}
                    </span>
                    <code className={styles.version}>
                      {status.binary.version}
                    </code>
                  </>
                ) : (
                  <span className={`${styles.badge} ${styles.muted}`}>
                    {__('Not Installed', 'wordforge')}
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className={styles.tableCell}>{__('Server', 'wordforge')}</td>
              <td>
                {status.server.running ? (
                  <>
                    <span className={`${styles.badge} ${styles.success}`}>
                      {__('Running', 'wordforge')}
                    </span>
                    <code className={styles.version}>
                      port {status.server.port}
                    </code>
                  </>
                ) : (
                  <span className={`${styles.badge} ${styles.muted}`}>
                    {__('Stopped', 'wordforge')}
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className={styles.tableCell}>
                {__('Platform', 'wordforge')}
              </td>
              <td>
                <code>{`${status.binary.os}-${status.binary.arch}`}</code>
              </td>
            </tr>
          </tbody>
        </table>

        <div className={`wordforge-actions ${styles.actions}`}>
          {!status.binary.is_installed ? (
            <Button
              variant="primary"
              onClick={() => serverAction.mutate('download')}
              isBusy={serverAction.isPending}
              disabled={serverAction.isPending}
              icon="download"
            >
              {__('Download OpenCode', 'wordforge')}
            </Button>
          ) : status.server.running ? (
            <>
              <Button
                variant="secondary"
                onClick={() => serverAction.mutate('stop')}
                isBusy={serverAction.isPending}
                disabled={serverAction.isPending}
                icon="controls-pause"
              >
                {__('Stop Server', 'wordforge')}
              </Button>
              <Button
                variant="primary"
                href="admin.php?page=wordforge-chat"
                icon="format-chat"
              >
                {__('Open Chat', 'wordforge')}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => serverAction.mutate('start')}
              isBusy={serverAction.isPending}
              disabled={serverAction.isPending}
              icon="controls-play"
            >
              {__('Start Server', 'wordforge')}
            </Button>
          )}
          {message && <span className={styles.message}>{message}</span>}
        </div>
      </CardBody>
    </Card>
  );
};
