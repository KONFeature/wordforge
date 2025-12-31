import { Button, Card, CardBody, CardHeader } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const performAction = async (action: 'download' | 'start' | 'stop') => {
    setIsProcessing(true);
    setMessage(
      action === 'download' ? __('Downloading...', 'wordforge') :
      action === 'start' ? __('Starting...', 'wordforge') :
      __('Stopping...', 'wordforge')
    );

    try {
      await apiFetch({
        path: `/wordforge/v1/opencode/${action}`,
        method: 'POST',
      });
      setMessage(
        action === 'download' ? __('Downloaded!', 'wordforge') :
        action === 'start' ? __('Started!', 'wordforge') :
        __('Stopped!', 'wordforge')
      );
      
      setTimeout(() => {
        onStatusChange();
        setMessage(null);
        setIsProcessing(false);
      }, 1000);
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="wordforge-card">
      <CardHeader>
        <h2>{__('Status', 'wordforge')}</h2>
      </CardHeader>
      <CardBody>
        <table className="wordforge-status-table" style={{ width: '100%', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0' }}>{__('MCP Adapter', 'wordforge')}</td>
              <td>
                {status.mcpAdapter ? (
                  <span style={{ background: '#00a32a', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Active', 'wordforge')}</span>
                ) : (
                  <span style={{ background: '#d63638', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Not Found', 'wordforge')}</span>
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0' }}>{__('WooCommerce', 'wordforge')}</td>
              <td>
                {status.woocommerce ? (
                  <span style={{ background: '#00a32a', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Active', 'wordforge')}</span>
                ) : (
                  <span style={{ background: '#646970', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Not Installed', 'wordforge')}</span>
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0' }}>{__('Plugin Version', 'wordforge')}</td>
              <td><code>{status.pluginVersion}</code></td>
            </tr>
          </tbody>
        </table>

        <h3>{__('OpenCode AI', 'wordforge')}</h3>
        <table className="wordforge-status-table" style={{ width: '100%', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0' }}>{__('Binary', 'wordforge')}</td>
              <td>
                {status.binary.is_installed ? (
                  <>
                    <span style={{ background: '#00a32a', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Installed', 'wordforge')}</span>
                    <code style={{ marginLeft: '8px' }}>{status.binary.version}</code>
                  </>
                ) : (
                  <span style={{ background: '#646970', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Not Installed', 'wordforge')}</span>
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0' }}>{__('Server', 'wordforge')}</td>
              <td>
                {status.server.running ? (
                  <>
                    <span style={{ background: '#00a32a', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Running', 'wordforge')}</span>
                    <code style={{ marginLeft: '8px' }}>port {status.server.port}</code>
                  </>
                ) : (
                  <span style={{ background: '#646970', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Stopped', 'wordforge')}</span>
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0' }}>{__('Platform', 'wordforge')}</td>
              <td><code>{`${status.binary.os}-${status.binary.arch}`}</code></td>
            </tr>
          </tbody>
        </table>

        <div className="wordforge-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!status.binary.is_installed ? (
            <Button
              variant="primary"
              onClick={() => performAction('download')}
              isBusy={isProcessing}
              disabled={isProcessing}
              icon="download"
            >
              {__('Download OpenCode', 'wordforge')}
            </Button>
          ) : status.server.running ? (
            <>
              <Button
                variant="secondary"
                onClick={() => performAction('stop')}
                isBusy={isProcessing}
                disabled={isProcessing}
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
              onClick={() => performAction('start')}
              isBusy={isProcessing}
              disabled={isProcessing}
              icon="controls-play"
            >
              {__('Start Server', 'wordforge')}
            </Button>
          )}
          {message && <span style={{ marginLeft: '8px', fontSize: '13px' }}>{message}</span>}
        </div>
      </CardBody>
    </Card>
  );
};
