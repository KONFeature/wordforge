import { createFileRoute } from '@tanstack/react-router';
import { Eye, Users } from 'lucide-react';
import { Card, Skeleton, StatCard } from '../../../components/ui';
import { useSiteStats } from '../../../hooks/useSiteStats';
import styles from './analytics.module.css';

export const Route = createFileRoute('/site/$siteId/analytics')({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { site } = Route.useRouteContext();
  const { data: stats, isLoading } = useSiteStats(site);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Loading analytics...</p>
        </div>
        <div className={styles.grid}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      </div>
    );
  }

  const analytics = stats?.analytics;

  if (!analytics) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Traffic and visitor statistics</p>
        </div>
        <Card className={styles.emptyState}>
          <h3>No Analytics Data</h3>
          <p>Connect Jetpack to see site statistics.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>Traffic and visitor statistics</p>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Users size={14} />
          <span>Visitors</span>
        </div>
        <div className={styles.grid}>
          <StatCard
            label="Today"
            value={analytics.visitors.today}
            icon={<Users size={18} />}
            subtext={
              <TrendIndicator
                current={analytics.visitors.today}
                previous={analytics.visitors.yesterday}
              />
            }
          />
          <StatCard
            label="Yesterday"
            value={analytics.visitors.yesterday}
            icon={<Users size={18} />}
            subtext="Unique visitors"
          />
          <StatCard
            label="This Week"
            value={analytics.visitors.week}
            icon={<Users size={18} />}
            subtext="Last 7 days"
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Eye size={14} />
          <span>Page Views</span>
        </div>
        <div className={styles.grid}>
          <StatCard
            label="Today"
            value={analytics.views.today}
            icon={<Eye size={18} />}
            subtext={
              <TrendIndicator
                current={analytics.views.today}
                previous={analytics.views.yesterday}
              />
            }
          />
          <StatCard
            label="Yesterday"
            value={analytics.views.yesterday}
            icon={<Eye size={18} />}
            subtext="Total views"
          />
          <StatCard
            label="This Week"
            value={analytics.views.week}
            icon={<Eye size={18} />}
            subtext="Last 7 days"
          />
        </div>
      </section>
    </div>
  );
}

function TrendIndicator({
  current,
  previous,
}: { current: number; previous: number }) {
  if (previous === 0) return <span>vs yesterday</span>;
  const change = ((current - previous) / previous) * 100;
  const isUp = change >= 0;
  const absChange = Math.abs(change).toFixed(0);

  return (
    <span className={isUp ? styles.trendUp : styles.trendDown}>
      {isUp ? '↑' : '↓'} {absChange}% vs yesterday
    </span>
  );
}
