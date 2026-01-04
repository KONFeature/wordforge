import { Download, ExternalLink, Play, Square } from 'lucide-react';
import type { UseOpenCodeReturn } from '../hooks/useOpenCode';

interface ServerControlsProps {
  opencode: UseOpenCodeReturn;
}

export function ServerControls({ opencode }: ServerControlsProps) {
  const isInstalled = opencode.status !== 'not_installed';
  const isRunning = opencode.status === 'running';
  const isStarting = opencode.status === 'starting';
  const isDownloading = opencode.isDownloading;

  if (isDownloading) {
    return (
      <div className="server-controls">
        <div className="progress-card">
          <div className="progress-info">
            <span>
              {opencode.downloadProgress?.message || 'Downloading OpenCode...'}
            </span>
            <span>{opencode.downloadProgress?.percent || 0}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${opencode.downloadProgress?.percent || 0}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className="server-controls">
        <button
          type="button"
          className="btn-server btn-download"
          onClick={() => opencode.download()}
        >
          <Download size={18} />
          <span>Download OpenCode</span>
        </button>
      </div>
    );
  }

  return (
    <div className="server-controls">
      <div className="server-buttons">
        <button
          type="button"
          className="btn-server btn-start"
          onClick={() => opencode.start()}
          disabled={isRunning || isStarting}
        >
          {isStarting ? <div className="spinner-small" /> : <Play size={18} />}
          <span>{isStarting ? 'Starting...' : 'Start'}</span>
        </button>
        <button
          type="button"
          className="btn-server btn-stop"
          onClick={() => opencode.stop()}
          disabled={!isRunning}
        >
          <Square size={16} />
          <span>Stop</span>
        </button>
        {isRunning && (
          <button
            type="button"
            className="btn-server btn-open"
            onClick={() => opencode.openView()}
          >
            <ExternalLink size={16} />
            <span>Open</span>
          </button>
        )}
      </div>
      <div className="server-status">
        <span
          className={`status-dot ${isRunning ? 'running' : isStarting ? 'starting' : 'stopped'}`}
        />
        <span className="status-text">
          {isRunning
            ? `Running on port ${opencode.port}`
            : isStarting
              ? 'Starting...'
              : 'Stopped'}
        </span>
      </div>
    </div>
  );
}
