import type { UseOpenCodeReturn } from '../hooks/useOpenCode';

export function OpenCodePanel({
  status,
  installedVersion,
  latestVersion,
  updateAvailable,
  port,
  isDownloading,
  downloadProgress,
  error,
  download,
  start,
  stop,
  openView,
  refresh,
}: UseOpenCodeReturn) {
  const isInstalled = status !== 'not_installed';
  const isRunning = status === 'running';
  const isStarting = status === 'starting';

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>OpenCode Server</h2>
        <button
          type="button"
          className="btn-icon"
          onClick={refresh}
          title="Refresh status"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="status-row">
        <span className="status-label">Status:</span>
        <StatusBadge status={status} />
      </div>

      {isInstalled && (
        <div className="status-row">
          <span className="status-label">Version:</span>
          <span className="status-value">{installedVersion || 'Unknown'}</span>
          {updateAvailable && latestVersion && (
            <span className="update-badge">
              Update available: {latestVersion}
            </span>
          )}
        </div>
      )}

      {isRunning && port && (
        <div className="status-row">
          <span className="status-label">Port:</span>
          <span className="status-value">{port}</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isDownloading && downloadProgress && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
          <span className="progress-text">{downloadProgress.message}</span>
        </div>
      )}

      <div className="button-group">
        {!isInstalled && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={download}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download OpenCode'}
          </button>
        )}

        {isInstalled && updateAvailable && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={download}
            disabled={isDownloading || isRunning}
          >
            {isDownloading ? 'Updating...' : 'Update OpenCode'}
          </button>
        )}

        {isInstalled && !isRunning && !isStarting && (
          <button type="button" className="btn btn-primary" onClick={start}>
            Start Server
          </button>
        )}

        {isStarting && (
          <button type="button" className="btn btn-primary" disabled>
            Starting...
          </button>
        )}

        {isRunning && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openView}
            >
              Open OpenCode
            </button>
            <button type="button" className="btn btn-secondary" onClick={stop}>
              Stop Server
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: UseOpenCodeReturn['status'] }) {
  let text: string;
  let className: string;

  if (status === 'not_installed') {
    text = 'Not Installed';
    className = 'badge badge-gray';
  } else if (status === 'stopped') {
    text = 'Stopped';
    className = 'badge badge-yellow';
  } else if (status === 'starting') {
    text = 'Starting';
    className = 'badge badge-blue';
  } else if (status === 'running') {
    text = 'Running';
    className = 'badge badge-green';
  } else if (typeof status === 'object' && 'error' in status) {
    text = 'Error';
    className = 'badge badge-red';
  } else {
    text = 'Unknown';
    className = 'badge badge-gray';
  }

  return <span className={className}>{text}</span>;
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
