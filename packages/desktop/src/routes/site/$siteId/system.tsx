import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  FileText,
  Image,
  Layout,
  MessageSquare,
  Paintbrush,
  Puzzle,
} from 'lucide-react';
import {
  Badge,
  Card,
  Skeleton,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui';
import { useSiteStats } from '../../../hooks/useSiteStats';
import styles from './system.module.css';

export const Route = createFileRoute('/site/$siteId/system')({
  component: SystemPage,
});

function SystemPage() {
  const { site } = Route.useRouteContext();
  const { data: stats, isLoading } = useSiteStats(site);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>System</h1>
          <p className={styles.subtitle}>Loading...</p>
        </div>
        <div className={styles.grid}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      </div>
    );
  }

  const { siteInfo, theme, plugins, content, templates } = stats || {};

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>System</h1>
        <p className={styles.subtitle}>Site health and configuration</p>
      </div>

      <section className={styles.section}>
        <div className={styles.grid}>
          <StatCard
            label="WordPress"
            value={siteInfo?.wordpressVersion || '?'}
            icon={<Activity size={18} />}
            subtext="Version"
          />
          <StatCard
            label="PHP"
            value={siteInfo?.phpVersion || '?'}
            icon={<Activity size={18} />}
            subtext="Version"
          />
          <StatCard
            label="Theme"
            value={theme?.name || '?'}
            icon={<Paintbrush size={18} />}
            subtext={`${theme?.version || ''} ${theme?.isBlockTheme ? '(Block Theme)' : ''}`}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Puzzle size={14} />
          <span>Plugins ({plugins?.active || 0} active)</span>
        </div>

        {plugins && plugins.list.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plugin</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plugins.list.map(
                (plugin: {
                  name: string;
                  version: string;
                  updateAvailable: boolean;
                }) => (
                  <TableRow key={plugin.name}>
                    <TableCell>{plugin.name}</TableCell>
                    <TableCell>{plugin.version}</TableCell>
                    <TableCell>
                      {plugin.updateAvailable ? (
                        <Badge variant="warning">Update Available</Badge>
                      ) : (
                        <Badge variant="success">Up to date</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Layout size={14} />
          <span>Content Counts</span>
        </div>
        <div className={styles.contentGrid}>
          <ContentCount
            label="Posts"
            value={content?.posts.total}
            icon={<FileText size={16} />}
          />
          <ContentCount
            label="Pages"
            value={content?.pages.total}
            icon={<FileText size={16} />}
          />
          <ContentCount
            label="Media"
            value={content?.media}
            icon={<Image size={16} />}
          />
          <ContentCount
            label="Comments"
            value={content?.comments.total}
            icon={<MessageSquare size={16} />}
          />
          <ContentCount
            label="Templates"
            value={templates?.total}
            icon={<Layout size={16} />}
          />
        </div>
      </section>
    </div>
  );
}

function ContentCount({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
}) {
  return (
    <Card className={styles.countCard}>
      <div className={styles.countLeft}>
        <div className={styles.countIcon}>{icon}</div>
        <span className={styles.countLabel}>{label}</span>
      </div>
      <span className={styles.countValue}>{value ?? 0}</span>
    </Card>
  );
}
