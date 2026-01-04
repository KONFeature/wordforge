import { useNavigate } from '@tanstack/react-router';
import {
  ExternalLink,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useConfigSync } from '../hooks/useConfigSync';
import { useOpenCodeStatus } from '../hooks/useOpenCode';
import { useSessions } from '../hooks/useSessions';
import { useSiteStats } from '../hooks/useSiteStats';
import { useSiteMutations } from '../hooks/useSites';
import type { WordPressSite } from '../types';
import { ServerControls } from './ServerControls';
import { SessionList } from './SessionList';
import { SiteStats } from './SiteStats';

interface SiteDashboardProps {
  site: WordPressSite;
}

export function SiteDashboard({ site }: SiteDashboardProps) {
  const navigate = useNavigate();
  const { data: stats, isLoading: isStatsLoading } = useSiteStats(site);
  const configSync = useConfigSync({ siteId: site.id });
  const { status, port } = useOpenCodeStatus();
  const { removeSite, openSiteFolder } = useSiteMutations();
  const sessions = useSessions();

  const isRunning = status === 'running' && port !== null;

  const handleConfigUpdate = async () => {
    await configSync.applyUpdate(isRunning);
  };

  const handleForceRefresh = async () => {
    await configSync.applyUpdate(isRunning);
  };

  const handleRemove = async () => {
    await removeSite(site.id);
    navigate({ to: '/onboarding' });
  };

  const handleOpenFolder = () => {
    openSiteFolder(site.id);
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
          onClick={handleOpenFolder}
          title="Open Site Folder"
        >
          <FolderOpen size={16} />
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={handleForceRefresh}
          disabled={configSync.isUpdating}
          title="Refresh OpenCode Config"
        >
          <RotateCcw
            size={16}
            className={configSync.isUpdating ? 'spinning' : ''}
          />
        </button>
        <button
          type="button"
          className="btn-icon danger"
          onClick={handleRemove}
          title="Remove Site"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {configSync.updateAvailable && (
        <div className="update-banner">
          <div className="update-info">
            <RefreshCw size={16} />
            <span>Configuration update available</span>
          </div>
          <button
            type="button"
            className="btn-update"
            onClick={handleConfigUpdate}
            disabled={configSync.isUpdating}
          >
            {configSync.isUpdating ? 'Updating...' : 'Update Now'}
          </button>
        </div>
      )}

      <ServerControls />

      <SessionList
        sessions={sessions.hierarchicalSessions}
        isLoading={sessions.isLoading}
        isServerRunning={sessions.isServerRunning}
        onOpenSession={sessions.openSession}
        onCreateSession={sessions.createAndOpenSession}
        onDeleteSession={sessions.deleteSession}
        isCreating={sessions.isCreating}
        isDeleting={sessions.isDeleting}
      />

      <SiteStats stats={stats} isLoading={isStatsLoading} />
    </div>
  );
}
