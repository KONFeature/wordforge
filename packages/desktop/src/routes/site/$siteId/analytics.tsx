import { createFileRoute } from '@tanstack/react-router';
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, Skeleton } from '../../../components/ui';
import {
  type JetpackCountryViews,
  type JetpackHighlights,
  type JetpackInsights,
  type JetpackReferrers,
  type JetpackSearchTerms,
  type JetpackTopPosts,
  type JetpackVisits,
  type StatsParams,
  type VisitsParams,
  useJetpackStats,
} from '../../../hooks/useJetpackStats';
import styles from './analytics.module.css';

export const Route = createFileRoute('/site/$siteId/analytics')({
  component: AnalyticsPage,
});

type Period = '7' | '30' | '90';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

function AnalyticsPage() {
  const { site } = Route.useRouteContext();
  const [period, setPeriod] = useState<Period>('30');

  const statsParams: StatsParams = {
    period: 'day',
    num: Number.parseInt(period),
  };

  const visitsParams: VisitsParams = {
    unit: 'day',
    quantity: Number.parseInt(period),
  };

  const { data, isLoading, isFetching } = useJetpackStats(site, {
    statsParams,
    visitsParams,
    highlightsPeriod: period === '7' ? '7-days' : '30-days',
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!data.available) {
    return <NotConnectedState />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Analytics</h1>
            <p className={styles.subtitle}>
              Traffic and visitor statistics from Jetpack
              {isFetching && ' (updating...)'}
            </p>
          </div>
          <div className={styles.periodSelector}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`${styles.periodButton} ${period === p.value ? styles.periodButtonActive : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <HighlightsSection
        visits={data.visits}
        highlights={data.highlights}
        period={period}
      />

      {data.visits && (
        <section className={styles.section}>
          <VisitsChart visits={data.visits} />
        </section>
      )}

      {data.insights && <InsightsSection insights={data.insights} />}

      <div className={styles.gridWide}>
        {data.topPosts && <TopPostsList posts={data.topPosts} />}
        {data.referrers && <ReferrersList referrers={data.referrers} />}
      </div>

      <div className={styles.gridWide}>
        {data.countryViews && (
          <CountryViewsList countries={data.countryViews} />
        )}
        {data.searchTerms && <SearchTermsList terms={data.searchTerms} />}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>Loading analytics...</p>
      </div>
      <div className={styles.loadingContainer}>
        <div className={styles.skeletonRow}>
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
        <Skeleton height={300} />
        <div className={styles.gridWide}>
          <Skeleton height={350} />
          <Skeleton height={350} />
        </div>
      </div>
    </div>
  );
}

function NotConnectedState() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>Traffic and visitor statistics</p>
      </div>
      <div className={styles.emptyState}>
        <Zap size={48} strokeWidth={1.5} />
        <h3>Jetpack Stats Not Connected</h3>
        <p>
          Connect your site to Jetpack to view detailed traffic analytics,
          visitor statistics, top posts, referrers, and more.
        </p>
        <Button
          variant="primary"
          onClick={() =>
            window.open('https://jetpack.com/features/traffic/', '_blank')
          }
        >
          Learn about Jetpack Stats
          <ExternalLink size={14} />
        </Button>
      </div>
    </div>
  );
}

interface HighlightsSectionProps {
  visits: JetpackVisits | null;
  highlights: JetpackHighlights | null;
  period: Period;
}

function HighlightsSection({
  visits,
  highlights,
  period,
}: HighlightsSectionProps) {
  const periodDays = Number.parseInt(period);

  const computeFromVisits = (): {
    views: number;
    visitors: number;
    prevViews: number;
    prevVisitors: number;
  } | null => {
    if (!visits?.data?.length) return null;

    const data = visits.data;
    const currentPeriod = data.slice(-periodDays);
    const previousPeriod = data.slice(-periodDays * 2, -periodDays);

    const views = currentPeriod.reduce((sum, [, v]) => sum + (v || 0), 0);
    const visitors = currentPeriod.reduce((sum, [, , v]) => sum + (v || 0), 0);
    const prevViews = previousPeriod.reduce((sum, [, v]) => sum + (v || 0), 0);
    const prevVisitors = previousPeriod.reduce(
      (sum, [, , v]) => sum + (v || 0),
      0,
    );

    return { views, visitors, prevViews, prevVisitors };
  };

  const getFromHighlights = (): {
    views: number;
    visitors: number;
    likes: number;
    comments: number;
    prevViews?: number;
    prevVisitors?: number;
    prevLikes?: number;
    prevComments?: number;
  } | null => {
    if (!highlights) return null;

    if (period === '7' && highlights.past_seven_days) {
      return {
        ...highlights.past_seven_days,
        prevViews: highlights.between_past_eight_and_fifteen_days?.views,
        prevVisitors: highlights.between_past_eight_and_fifteen_days?.visitors,
        prevLikes: highlights.between_past_eight_and_fifteen_days?.likes,
        prevComments: highlights.between_past_eight_and_fifteen_days?.comments,
      };
    }

    if ((period === '30' || period === '90') && highlights.past_thirty_days) {
      return {
        ...highlights.past_thirty_days,
        prevViews: highlights.between_past_thirty_one_and_sixty_days?.views,
        prevVisitors:
          highlights.between_past_thirty_one_and_sixty_days?.visitors,
        prevLikes: highlights.between_past_thirty_one_and_sixty_days?.likes,
        prevComments:
          highlights.between_past_thirty_one_and_sixty_days?.comments,
      };
    }

    return null;
  };

  const visitsData = computeFromVisits();
  const highlightsData = getFromHighlights();

  const metrics =
    period === '90' && visitsData
      ? [
          {
            key: 'views',
            label: 'Views',
            value: visitsData.views,
            prev: visitsData.prevViews,
          },
          {
            key: 'visitors',
            label: 'Visitors',
            value: visitsData.visitors,
            prev: visitsData.prevVisitors,
          },
        ]
      : highlightsData
        ? [
            {
              key: 'views',
              label: 'Views',
              value: highlightsData.views,
              prev: highlightsData.prevViews,
            },
            {
              key: 'visitors',
              label: 'Visitors',
              value: highlightsData.visitors,
              prev: highlightsData.prevVisitors,
            },
            {
              key: 'likes',
              label: 'Likes',
              value: highlightsData.likes,
              prev: highlightsData.prevLikes,
            },
            {
              key: 'comments',
              label: 'Comments',
              value: highlightsData.comments,
              prev: highlightsData.prevComments,
            },
          ]
        : visitsData
          ? [
              {
                key: 'views',
                label: 'Views',
                value: visitsData.views,
                prev: visitsData.prevViews,
              },
              {
                key: 'visitors',
                label: 'Visitors',
                value: visitsData.visitors,
                prev: visitsData.prevVisitors,
              },
            ]
          : [];

  if (metrics.length === 0) return null;

  return (
    <section className={styles.highlightsGrid}>
      {metrics.map((metric) => {
        const change = metric.prev
          ? ((metric.value - metric.prev) / metric.prev) * 100
          : 0;
        const isUp = change >= 0;

        return (
          <div key={metric.key} className={styles.highlightCard}>
            <span className={styles.highlightLabel}>{metric.label}</span>
            <span className={styles.highlightValue}>
              {formatNumber(metric.value)}
            </span>
            {metric.prev !== undefined && metric.prev > 0 && (
              <span
                className={`${styles.highlightCompare} ${isUp ? styles.trendUp : styles.trendDown}`}
              >
                {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(change).toFixed(0)}% vs previous period
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}

function InsightsSection({ insights }: { insights: JetpackInsights }) {
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const bestDay = dayNames[insights.highest_day_of_week] ?? 'Unknown';
  const bestHour = formatHour(insights.highest_hour);

  return (
    <section className={styles.grid}>
      <div className={styles.insightCard}>
        <div className={styles.insightIcon}>
          <Calendar size={24} />
        </div>
        <div className={styles.insightContent}>
          <span className={styles.insightLabel}>Best Day to Post</span>
          <span className={styles.insightValue}>{bestDay}</span>
          <span className={styles.insightHint}>
            {insights.highest_day_percent}% of your views
          </span>
        </div>
      </div>
      <div className={styles.insightCard}>
        <div className={styles.insightIcon}>
          <Clock size={24} />
        </div>
        <div className={styles.insightContent}>
          <span className={styles.insightLabel}>Best Time to Post</span>
          <span className={styles.insightValue}>{bestHour}</span>
          <span className={styles.insightHint}>
            {insights.highest_hour_percent}% of your views
          </span>
        </div>
      </div>
      {insights.posting_streak && (
        <div className={styles.insightCard}>
          <div className={styles.insightIcon}>
            <Zap size={24} />
          </div>
          <div className={styles.insightContent}>
            <span className={styles.insightLabel}>Current Streak</span>
            <span className={styles.insightValue}>
              {insights.posting_streak.streak} days
            </span>
            <span className={styles.insightHint}>
              Longest: {insights.posting_streak.long_streak} days
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function VisitsChart({ visits }: { visits: JetpackVisits }) {
  const chartData = visits.data.map(([date, views, visitors]) => ({
    date: formatDate(date),
    fullDate: date,
    views,
    visitors,
  }));

  const totalViews = chartData.reduce((sum, d) => sum + d.views, 0);
  const totalVisitors = chartData.reduce((sum, d) => sum + d.visitors, 0);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <div className={styles.chartTitle}>
            <TrendingUp size={18} />
            Traffic Overview
          </div>
          <div className={styles.chartSubtitle}>
            {formatNumber(totalViews)} views &bull;{' '}
            {formatNumber(totalVisitors)} visitors
          </div>
        </div>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
              dx={-10}
              tickFormatter={formatNumber}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="views"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorViews)"
              name="Views"
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#colorVisitors)"
              name="Visitors"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '8px' }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: entry.color,
            }}
          />
          <span style={{ color: '#fafafa', fontSize: '13px' }}>
            {entry.name}: {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function TopPostsList({ posts }: { posts: JetpackTopPosts }) {
  const allPosts = Object.values(posts.days)
    .flatMap((day) => day.postviews)
    .reduce(
      (acc, post) => {
        const existing = acc.find((p) => p.id === post.id);
        if (existing) {
          existing.views += post.views;
        } else {
          acc.push({ ...post });
        }
        return acc;
      },
      [] as Array<{
        id: number;
        href: string;
        title: string;
        type: string;
        views: number;
      }>,
    )
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>
          <FileText size={16} />
          Top Posts
        </span>
      </div>
      <div className={styles.listContent}>
        {allPosts.length === 0 ? (
          <div className={styles.listEmpty}>No post data available</div>
        ) : (
          allPosts.map((post, i) => (
            <div key={post.id} className={styles.listItem}>
              <div className={styles.listItemMain}>
                <div className={styles.listItemIcon}>
                  <span
                    style={{
                      color: '#71717a',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className={styles.listItemText}>
                  <span className={styles.listItemName}>
                    {post.title || 'Untitled'}
                  </span>
                  <span className={styles.listItemUrl}>{post.type}</span>
                </div>
              </div>
              <span className={styles.listItemValue}>
                {formatNumber(post.views)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReferrersList({ referrers }: { referrers: JetpackReferrers }) {
  const allReferrers = Object.values(referrers.days)
    .flatMap((day) => day.groups)
    .reduce(
      (acc, ref) => {
        const existing = acc.find((r) => r.name === ref.name);
        if (existing) {
          existing.views += ref.views;
        } else {
          acc.push({ ...ref });
        }
        return acc;
      },
      [] as Array<{ name: string; url: string; icon: string; views: number }>,
    )
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>
          <Link2 size={16} />
          Top Referrers
        </span>
      </div>
      <div className={styles.listContent}>
        {allReferrers.length === 0 ? (
          <div className={styles.listEmpty}>No referrer data available</div>
        ) : (
          allReferrers.map((ref) => (
            <div key={ref.name} className={styles.listItem}>
              <div className={styles.listItemMain}>
                <div className={styles.listItemIcon}>
                  {ref.icon ? (
                    <img
                      src={ref.icon}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Globe size={14} style={{ color: '#71717a' }} />
                  )}
                </div>
                <div className={styles.listItemText}>
                  <span className={styles.listItemName}>{ref.name}</span>
                  {ref.url && (
                    <span className={styles.listItemUrl}>{ref.url}</span>
                  )}
                </div>
              </div>
              <span className={styles.listItemValue}>
                {formatNumber(ref.views)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CountryViewsList({ countries }: { countries: JetpackCountryViews }) {
  const countryInfo = countries['country-info'] ?? {};

  const allCountries = Object.values(countries.days)
    .flatMap((day) => day.views)
    .reduce(
      (acc, country) => {
        const existing = acc.find(
          (c) => c.country_code === country.country_code,
        );
        if (existing) {
          existing.views += country.views;
        } else {
          acc.push({ ...country });
        }
        return acc;
      },
      [] as Array<{ country_code: string; views: number }>,
    )
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>
          <Globe size={16} />
          Top Countries
        </span>
      </div>
      <div className={styles.listContent}>
        {allCountries.length === 0 ? (
          <div className={styles.listEmpty}>No country data available</div>
        ) : (
          allCountries.map((country) => {
            const info = countryInfo[country.country_code];
            return (
              <div key={country.country_code} className={styles.listItem}>
                <div className={styles.listItemMain}>
                  <span className={styles.countryFlag}>
                    {countryCodeToEmoji(country.country_code)}
                  </span>
                  <div className={styles.listItemText}>
                    <span className={styles.listItemName}>
                      {info?.country_full ?? country.country_code}
                    </span>
                  </div>
                </div>
                <span className={styles.listItemValue}>
                  {formatNumber(country.views)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SearchTermsList({ terms }: { terms: JetpackSearchTerms }) {
  const allTerms = Object.values(terms.days)
    .flatMap((day) => day.search_terms)
    .reduce(
      (acc, term) => {
        const existing = acc.find((t) => t.term === term.term);
        if (existing) {
          existing.views += term.views;
        } else {
          acc.push({ ...term });
        }
        return acc;
      },
      [] as Array<{ term: string; views: number }>,
    )
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>
          <Search size={16} />
          Search Terms
        </span>
      </div>
      <div className={styles.listContent}>
        {allTerms.length === 0 ? (
          <div className={styles.listEmpty}>No search term data available</div>
        ) : (
          allTerms.map((term) => (
            <div key={term.term} className={styles.listItem}>
              <div className={styles.listItemMain}>
                <div className={styles.listItemIcon}>
                  <Search size={14} style={{ color: '#71717a' }} />
                </div>
                <div className={styles.listItemText}>
                  <span className={styles.listItemName}>{term.term}</span>
                </div>
              </div>
              <span className={styles.listItemValue}>
                {formatNumber(term.views)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (!num) return '';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${suffix}`;
}

function countryCodeToEmoji(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
