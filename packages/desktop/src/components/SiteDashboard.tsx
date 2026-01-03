import { ExternalLink, Trash2, AlertCircle, ArrowRight } from 'lucide-react';
import type { WordPressSite } from '../types';
import type { UseOpenCodeReturn } from '../hooks/useOpenCode';

interface SiteDashboardProps {
  site: WordPressSite;
  opencode: UseOpenCodeReturn;
  onRemove: () => void;
}

export function SiteDashboard({
  site,
  opencode,
  onRemove,
}: SiteDashboardProps) {
  const isInstalled = opencode.status !== 'not_installed';
  const isStarting = opencode.status === 'starting';
  const isDownloading = opencode.isDownloading;

  const handleStart = () => {
    if (!isInstalled) {
      opencode.download();
    } else {
      opencode.start();
    }
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
            className="btn-start-server"
            onClick={handleStart}
            disabled={isStarting}
          >
            <div className="btn-content">
              {isStarting ? (
                <div className="spinner" />
              ) : (
                <ArrowRight size={32} />
              )}
              <div className="text-group">
                <span className="primary-text">
                  {isStarting
                    ? 'Starting Server...'
                    : !isInstalled
                      ? 'Download & Start OpenCode'
                      : 'Start OpenCode'}
                </span>
                <span className="secondary-text">
                  Launch the AI assistant for your site
                </span>
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h3>Content</h3>
          <p>Create and edit posts with AI assistance</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3>Design</h3>
          <p>Update theme styles and templates</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🛒</div>
          <h3>Commerce</h3>
          <p>Manage products and orders</p>
        </div>
      </div>
    </div>
  );
}
