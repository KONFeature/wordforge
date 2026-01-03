import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Image,
  Layout,
  MessageSquare,
  Package,
  Paintbrush,
  Puzzle,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import '../styles/site-stats.css';
import type { SiteStatsProps } from '../types';

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.rendered === 'string') return obj.rendered;
    if (typeof obj.raw === 'string') return obj.raw;
  }
  return String(value);
}

export function SiteStats({ stats, isLoading }: SiteStatsProps) {
  if (isLoading) {
    return <StatsSkeleton />;
  }

  if (!stats) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <AlertCircle size={48} />
        </div>
        <h3>No Statistics Available</h3>
        <p>Connect to your site to view dashboard analytics.</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const {
    content,
    woocommerce,
    users,
    theme,
    plugins,
    siteInfo,
    analytics,
    recentPosts,
    templates,
  } = stats;
  const [showPlugins, setShowPlugins] = useState(false);

  return (
    <div className="site-stats-container">
      {analytics && (
        <section>
          <div className="section-title">
            <TrendingUp size={14} />
            <span>Analytics</span>
          </div>
          <div className="stats-grid-primary">
            <StatCard
              label="Visitors Today"
              value={analytics.visitors.today}
              icon={<Users size={18} />}
              subtext={
                analytics.visitors.yesterday > 0 ? (
                  <TrendIndicator
                    current={analytics.visitors.today}
                    previous={analytics.visitors.yesterday}
                  />
                ) : (
                  'vs yesterday'
                )
              }
            />
            <StatCard
              label="Page Views Today"
              value={analytics.views.today}
              icon={<Eye size={18} />}
              subtext={
                analytics.views.yesterday > 0 ? (
                  <TrendIndicator
                    current={analytics.views.today}
                    previous={analytics.views.yesterday}
                  />
                ) : (
                  'vs yesterday'
                )
              }
            />
            <StatCard
              label="Weekly Visitors"
              value={analytics.visitors.week}
              icon={<TrendingUp size={18} />}
              subtext="Last 7 days"
            />
            <StatCard
              label="Weekly Views"
              value={analytics.views.week}
              icon={<Eye size={18} />}
              subtext="Last 7 days"
            />
          </div>
        </section>
      )}

      <section>
        <div className="section-title">
          <Activity size={14} />
          <span>Content Overview</span>
        </div>
        <div className="stats-grid-primary">
          <StatCard
            label="Posts"
            value={content?.posts.total}
            icon={<FileText size={18} />}
            subtext={`${content?.posts.published || 0} published`}
          />
          <StatCard
            label="Pages"
            value={content?.pages.total}
            icon={<FileText size={18} />}
            subtext={`${content?.pages.published || 0} published`}
          />
          <StatCard
            label="Media"
            value={content?.media}
            icon={<Image size={18} />}
            subtext="Items"
          />
          <StatCard
            label="Comments"
            value={content?.comments.total}
            icon={<MessageSquare size={18} />}
            subtext={
              content?.comments.pending ? (
                <span className="text-warning">
                  {content.comments.pending} pending
                </span>
              ) : (
                'All approved'
              )
            }
            badge={
              content?.comments.pending ? (
                <span className="stat-badge pending">Action Needed</span>
              ) : null
            }
          />
        </div>
      </section>

      {woocommerce && (
        <section>
          <div className="section-title">
            <ShoppingCart size={14} />
            <span>Store</span>
          </div>
          <div className="stats-grid-primary">
            <div className="stat-card revenue-card">
              <div className="stat-header">
                <span className="stat-label">30-Day Revenue</span>
                <div className="stat-icon">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="stat-value">
                {formatCurrency(
                  woocommerce.orders.revenue.total,
                  woocommerce.orders.revenue.currency,
                )}
              </div>
              <div className="stat-subtext">
                <span className="stat-badge success">
                  {woocommerce.orders.completed} completed
                </span>
              </div>
            </div>

            <StatCard
              label="Orders"
              value={woocommerce.orders.total}
              icon={<ShoppingCart size={18} />}
              subtext={
                woocommerce.orders.processing > 0 ? (
                  <span className="text-primary">
                    {woocommerce.orders.processing} processing
                  </span>
                ) : (
                  'Fulfilled'
                )
              }
            />

            <StatCard
              label="Products"
              value={woocommerce.products.total}
              icon={<Package size={18} />}
              subtext={`${woocommerce.products.published} published`}
            />
          </div>
        </section>
      )}

      <section>
        <div className="health-row">
          <HealthPill
            label="WordPress"
            value={safeString(siteInfo?.wordpressVersion) || '?'}
            icon={<Activity size={16} />}
          />
          <HealthPill
            label="PHP"
            value={safeString(siteInfo?.phpVersion) || '?'}
            icon={<Activity size={16} />}
          />
          <HealthPill
            label="Theme"
            value={safeString(theme?.name) || '?'}
            icon={<Paintbrush size={16} />}
          />
          {templates && templates.total > 0 && (
            <HealthPill
              label="Templates"
              value={`${templates.total}`}
              icon={<Layout size={16} />}
            />
          )}
          <HealthPill
            label="Plugins"
            value={`${plugins?.active || 0}`}
            icon={<Puzzle size={16} />}
            onClick={() => setShowPlugins(!showPlugins)}
            badge={
              plugins?.updatesAvailable ? (
                <span className="update-badge">{plugins.updatesAvailable}</span>
              ) : undefined
            }
          />
          {users && (
            <HealthPill
              label="Users"
              value={formatNumber(users.total)}
              icon={<Users size={16} />}
            />
          )}
        </div>

        {showPlugins && plugins && plugins.list.length > 0 && (
          <div className="expandable-list">
            <div className="list-header">
              <span>Active Plugins</span>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowPlugins(false)}
              >
                <ChevronUp size={16} />
              </button>
            </div>
            <div className="list-items">
              {plugins.list.map((plugin) => (
                <div key={plugin.name} className="list-item">
                  <span className="item-name">{plugin.name}</span>
                  <span className="item-meta">
                    v{plugin.version}
                    {plugin.updateAvailable && (
                      <span className="update-dot" title="Update available" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {recentPosts && recentPosts.length > 0 && (
        <section>
          <div className="section-title">
            <Clock size={14} />
            <span>Recently Modified</span>
          </div>
          <div className="recent-posts">
            {recentPosts.map((post) => (
              <div key={post.id} className="recent-post-item">
                <FileText size={14} className="post-icon" />
                <span className="post-title">{post.title}</span>
                <span className="post-date">
                  {formatRelativeDate(post.date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: unknown;
  icon: ReactNode;
  subtext?: ReactNode;
  badge?: ReactNode;
}

function StatCard({ label, value, icon, subtext, badge }: StatCardProps) {
  const displayValue =
    value === undefined || value === null
      ? '-'
      : typeof value === 'number'
        ? new Intl.NumberFormat('en-US').format(value)
        : safeString(value) || '-';

  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <div>
        <div className="stat-value">{displayValue}</div>
        {badge && <div style={{ marginTop: '0.5rem' }}>{badge}</div>}
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}

interface HealthPillProps {
  label: string;
  value: unknown;
  icon: ReactNode;
  onClick?: () => void;
  badge?: ReactNode;
}

function HealthPill({ label, value, icon, onClick, badge }: HealthPillProps) {
  const displayValue = safeString(value) || '-';
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={`health-pill ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="health-icon">{icon}</div>
      <div className="health-content">
        <span className="health-label">{label}</span>
        <span className="health-value">
          {displayValue}
          {badge}
        </span>
      </div>
      {onClick && <ChevronDown size={14} className="chevron-icon" />}
    </Component>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
    <span className={isUp ? 'text-success' : 'text-warning'}>
      {isUp ? '↑' : '↓'} {absChange}% vs yesterday
    </span>
  );
}

function StatsSkeleton() {
  return (
    <div className="site-stats-container">
      <div className="stats-grid-primary">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card skeleton">
            <div
              className="stat-header"
              style={{ marginBottom: '2rem', opacity: 0 }}
            >
              .
            </div>
            <div className="skeleton-text" />
            <div className="skeleton-text" style={{ width: '40%' }} />
          </div>
        ))}
      </div>
      <div className="health-row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="health-pill skeleton">
            <div className="skeleton-rect" />
          </div>
        ))}
      </div>
    </div>
  );
}
