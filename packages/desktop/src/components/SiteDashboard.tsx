import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FolderOpen,
  Play,
  Trash2,
} from 'lucide-react';
import type { UseOpenCodeReturn } from '../hooks/useOpenCode';
import { useSiteStats } from '../hooks/useSiteStats';
import type { WordPressSite } from '../types';
import { SiteStats } from './SiteStats';

interface SiteDashboardProps {
  site: WordPressSite;
  opencode: UseOpenCodeReturn;
  onRemove: () => void;
  onOpenFolder: () => void;
}

export function SiteDashboard({
  site,
  opencode,
  onRemove,
  onOpenFolder,
}: SiteDashboardProps) {
  const { data: stats, isLoading: isStatsLoading } = useSiteStats(site);

  const isInstalled = opencode.status !== 'not_installed';
  const isRunning = opencode.status === 'running';
  const isStarting = opencode.status === 'starting';
  const isDownloading = opencode.isDownloading;

  const handleAction = () => {
    if (isRunning) {
      opencode.openView();
    } else if (!isInstalled) {
      opencode.download();
    } else {
      opencode.start();
    }
  };

  const getButtonText = () => {
    if (isStarting) return 'Starting Server...';
    if (isRunning) return 'Open OpenCode';
    if (!isInstalled) return 'Download & Start OpenCode';
    return 'Start OpenCode';
  };

  const getButtonSubtext = () => {
    if (isRunning) return `Running on port ${opencode.port}`;
    return 'Launch the AI assistant for your site';
  };

  return (
    <div className="site-dashboard">
      <div className="site-info-card">
        <div className="site-icon">
          <img
            src={`https://www.google.com/s2/favicons?domain=${site.url}&sz=64`}
            alt="Site Icon"
          />
        </div>
        <div className="site-details">
          <h2>{site.name}</h2>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="site-link"
          >
            {site.url}
            <ExternalLink size={12} />
          </a>
          <div className="site-meta">
            Connected as <strong>{site.username}</strong>
          </div>
        </div>
        <button
          type="button"
          className="btn-icon"
          onClick={onOpenFolder}
          title="Open Site Folder"
        >
          <FolderOpen size={16} />
        </button>
        <button
          type="button"
          className="btn-icon danger"
          onClick={onRemove}
          title="Remove Site"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="action-area">
        {opencode.error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{opencode.error}</span>
          </div>
        )}

        {isDownloading ? (
          <div className="progress-card">
            <div className="progress-info">
              <span>
                {opencode.downloadProgress?.message ||
                  'Downloading OpenCode...'}
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
        ) : (
          <button
            type="button"
            className={`btn-start-server ${isRunning ? 'running' : ''}`}
            onClick={handleAction}
            disabled={isStarting}
          >
            <div className="btn-content">
              {isStarting ? (
                <div className="spinner" />
              ) : isRunning ? (
                <Play size={32} />
              ) : (
                <ArrowRight size={32} />
              )}
              <div className="text-group">
                <span className="primary-text">{getButtonText()}</span>
                <span className="secondary-text">{getButtonSubtext()}</span>
              </div>
            </div>
          </button>
        )}
      </div>

      <SiteStats stats={stats} isLoading={isStatsLoading} />
    </div>
  );
}
