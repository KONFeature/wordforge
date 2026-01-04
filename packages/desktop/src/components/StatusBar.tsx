import type { OpenCodeStatus } from '../hooks/useOpenCode';

interface StatusBarProps {
  status: OpenCodeStatus;
  port: number | null;
  installedVersion?: string | null;
  siteConnected: boolean;
}

export function StatusBar({
  status,
  port,
  installedVersion,
  siteConnected,
}: StatusBarProps) {
  const statusClass = typeof status === 'object' ? 'error' : status;
  const statusText =
    status === 'running'
      ? `Running (Port ${port})`
      : typeof status === 'string'
        ? status
        : 'Error';

  return (
    <footer className="status-bar">
      <div className="status-item">
        <span
          className={`status-indicator ${siteConnected ? 'connected' : 'disconnected'}`}
        />
        <span className="status-text">
          {siteConnected ? 'Site Connected' : 'No Site Connected'}
        </span>
      </div>

      <div className="status-divider" />

      <div className="status-item">
        <span className={`status-indicator opencode-${statusClass}`} />
        <span className="status-text">OpenCode: {statusText}</span>
      </div>

      <div className="status-spacer" />

      <div className="status-item">
        <span className="status-version">v{installedVersion || '---'}</span>
      </div>
    </footer>
  );
}
