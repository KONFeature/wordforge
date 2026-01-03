import type { UseOpenCodeReturn } from '../hooks/useOpenCode';

interface StatusBarProps {
  opencode: UseOpenCodeReturn;
  siteConnected: boolean;
}

export function StatusBar({ opencode, siteConnected }: StatusBarProps) {
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
        <span
          className={`status-indicator opencode-${typeof opencode.status === 'object' ? 'error' : opencode.status}`}
        />
        <span className="status-text">
          OpenCode:{' '}
          {opencode.status === 'running'
            ? `Running (Port ${opencode.port})`
            : typeof opencode.status === 'string'
              ? opencode.status
              : 'Error'}
        </span>
      </div>

      <div className="status-spacer" />

      <div className="status-item">
        <span className="status-version">
          v{opencode.installedVersion || '---'}
        </span>
      </div>
    </footer>
  );
}
