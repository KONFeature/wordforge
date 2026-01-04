import { useNavigate, useParams } from '@tanstack/react-router';
import { Download, ExternalLink, Play, Square } from 'lucide-react';
import {
  useOpenCodeActions,
  useOpenCodeDownload,
  useOpenCodeStatus,
} from '../hooks/useOpenCode';

export function ServerControls() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const siteId = params.siteId as string | undefined;

  const { status, port } = useOpenCodeStatus();
  const { start, stop, isStarting } = useOpenCodeActions();
  const { download, isDownloading, downloadProgress } = useOpenCodeDownload();

  const isInstalled = status !== 'not_installed';
  const isRunning = status === 'running';
  const isStartingStatus = status === 'starting' || isStarting;

  const handleOpenCode = () => {
    if (siteId) {
      navigate({ to: '/site/$siteId/code', params: { siteId } });
    }
  };

  if (isDownloading) {
    return (
      <div className="server-controls">
        <div className="progress-card">
          <div className="progress-info">
            <span>
              {downloadProgress?.message || 'Downloading OpenCode...'}
            </span>
            <span>{downloadProgress?.percent || 0}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${downloadProgress?.percent || 0}%` }}
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
          onClick={() => download()}
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
          onClick={() => start()}
          disabled={isRunning || isStartingStatus}
        >
          {isStartingStatus ? (
            <div className="spinner-small" />
          ) : (
            <Play size={18} />
          )}
          <span>{isStartingStatus ? 'Starting...' : 'Start'}</span>
        </button>
        <button
          type="button"
          className="btn-server btn-stop"
          onClick={() => stop()}
          disabled={!isRunning}
        >
          <Square size={16} />
          <span>Stop</span>
        </button>
        {isRunning && siteId && (
          <button
            type="button"
            className="btn-server btn-open"
            onClick={handleOpenCode}
          >
            <ExternalLink size={16} />
            <span>Open</span>
          </button>
        )}
      </div>
      <div className="server-status">
        <span
          className={`status-dot ${isRunning ? 'running' : isStartingStatus ? 'starting' : 'stopped'}`}
        />
        <span className="status-text">
          {isRunning
            ? `Running on port ${port}`
            : isStartingStatus
              ? 'Starting...'
              : 'Stopped'}
        </span>
      </div>
    </div>
  );
}
