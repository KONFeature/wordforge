import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  BarChart2,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  Settings,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { ServerControls } from '../../../components/ServerControls';
import { SessionList } from '../../../components/SessionList';
import { Button, Card, IconButton, StatCard } from '../../../components/ui';
import { useConfigSync } from '../../../hooks/useConfigSync';
import { useSessions } from '../../../hooks/useSessions';
import { useSiteStats } from '../../../hooks/useSiteStats';
import { useSiteMutations } from '../../../hooks/useSites';
import styles from './index.module.css';

export const Route = createFileRoute('/site/$siteId/')({
  component: SiteHomePage,
});

function SiteHomePage() {
  const { site } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: stats, isLoading: isStatsLoading } = useSiteStats(site);
  const configSync = useConfigSync({ siteId: site.id });
  const { removeSite, openSiteFolder } = useSiteMutations();
  const sessions = useSessions();

  const handleConfigUpdate = async () => {
    await configSync.applyUpdate(true);
  };

  const handleForceRefresh = async () => {
    await configSync.applyUpdate(true);
  };

  const handleRemove = async () => {
    await removeSite(site.id);
    navigate({ to: '/onboarding' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{site.name}</h1>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            {site.url} <ExternalLink size={12} />
          </a>
        </div>
        <div className={styles.actions}>
          <IconButton
            aria-label="Open Site Folder"
            onClick={() => openSiteFolder(site.id)}
          >
            <FolderOpen size={16} />
          </IconButton>
          <IconButton
            aria-label="Refresh OpenCode Config"
            onClick={handleForceRefresh}
            disabled={configSync.isUpdating}
          >
            <RotateCcw
              size={16}
              className={configSync.isUpdating ? styles.spinning : ''}
            />
          </IconButton>
          <IconButton
            aria-label="Remove Site"
            onClick={handleRemove}
            className={styles.dangerBtn}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      {configSync.updateAvailable && (
        <Card className={styles.updateBanner}>
          <div className={styles.updateInfo}>
            <RefreshCw size={16} />
            <span>Configuration update available</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfigUpdate}
            disabled={configSync.isUpdating}
            isLoading={configSync.isUpdating}
          >
            Update Now
          </Button>
        </Card>
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

      {!isStatsLoading && stats && (
        <div className={styles.statsGrid}>
          <Link
            to="/site/$siteId/system"
            params={{ siteId: site.id }}
            className={styles.statLink}
          >
            <StatCard
              label="Content"
              value={stats.content?.posts.total || 0}
              icon={<Settings size={18} />}
              subtext="Posts & Pages"
              interactive
            />
          </Link>

          {stats.woocommerce && (
            <Link
              to="/site/$siteId/woocommerce"
              params={{ siteId: site.id }}
              className={styles.statLink}
            >
              <StatCard
                label="Store Revenue"
                value={new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: stats.woocommerce.orders.revenue.currency,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(stats.woocommerce.orders.revenue.total)}
                icon={<ShoppingCart size={18} />}
                subtext="30-Day Revenue"
                isRevenue
              />
            </Link>
          )}

          {stats.analytics && (
            <Link
              to="/site/$siteId/analytics"
              params={{ siteId: site.id }}
              className={styles.statLink}
            >
              <StatCard
                label="Visitors Today"
                value={stats.analytics.visitors.today}
                icon={<BarChart2 size={18} />}
                subtext={
                  stats.analytics.visitors.yesterday > 0
                    ? `${Math.round(((stats.analytics.visitors.today - stats.analytics.visitors.yesterday) / stats.analytics.visitors.yesterday) * 100)}% vs yesterday`
                    : 'No data yesterday'
                }
              />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
