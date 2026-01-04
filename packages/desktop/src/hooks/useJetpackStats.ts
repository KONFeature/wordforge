import { useQueries, useQuery } from '@tanstack/react-query';
import { wpFetch } from '../lib/wpFetch';
import type { WordPressSite } from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const jetpackStatsKeys = {
  all: ['jetpack-stats'] as const,
  site: (siteId: string) => [...jetpackStatsKeys.all, siteId] as const,
  siteId: (siteId: string) =>
    [...jetpackStatsKeys.site(siteId), 'site-id'] as const,
  stats: (siteId: string) =>
    [...jetpackStatsKeys.site(siteId), 'stats'] as const,
  insights: (siteId: string) =>
    [...jetpackStatsKeys.site(siteId), 'insights'] as const,
  highlights: (siteId: string, period: HighlightsPeriod) =>
    [...jetpackStatsKeys.site(siteId), 'highlights', period] as const,
  visits: (siteId: string, params: VisitsParams) =>
    [...jetpackStatsKeys.site(siteId), 'visits', params] as const,
  clicks: (siteId: string, params: StatsParams) =>
    [...jetpackStatsKeys.site(siteId), 'clicks', params] as const,
  countryViews: (siteId: string, params: StatsParams) =>
    [...jetpackStatsKeys.site(siteId), 'country-views', params] as const,
  referrers: (siteId: string, params: StatsParams) =>
    [...jetpackStatsKeys.site(siteId), 'referrers', params] as const,
  topPosts: (siteId: string, params: StatsParams) =>
    [...jetpackStatsKeys.site(siteId), 'top-posts', params] as const,
  searchTerms: (siteId: string, params: StatsParams) =>
    [...jetpackStatsKeys.site(siteId), 'search-terms', params] as const,
};

// ============================================================================
// Types - Request Parameters
// ============================================================================

export type StatsPeriod = 'day' | 'week' | 'month' | 'year';
export type HighlightsPeriod = '7-days' | '30-days';

export interface StatsParams {
  /** Number of periods to include */
  num?: number;
  /** Period granularity */
  period?: StatsPeriod;
  /** Start date (YYYY-MM-DD) */
  date?: string;
  /** Maximum results */
  max?: number;
}

export interface VisitsParams extends StatsParams {
  /** Unit for time series: day, week, month, year */
  unit?: StatsPeriod;
  /** Number of data points */
  quantity?: number;
}

// ============================================================================
// Types - API Responses
// ============================================================================

/** Response from /jetpack/v4/connection/data */
export interface JetpackConnectionData {
  currentUser?: {
    isConnected: boolean;
    wpcomUser?: {
      ID: number;
      login: string;
      display_name: string;
    };
  };
  connectionOwner?: string;
  isRegistered?: boolean;
  hasConnectedOwner?: boolean;
  wpcomBlogId?: number;
}

/** Response from /sites/{id}/stats - General site statistics */
export interface JetpackSiteStats {
  date: string;
  stats: {
    visitors_today: number;
    visitors_yesterday: number;
    visitors: number;
    views_today: number;
    views_yesterday: number;
    views_best_day: string;
    views_best_day_total: number;
    views: number;
    comments: number;
    posts: number;
    followers_blog: number;
    followers_comments: number;
    comments_per_month: number;
    comments_most_active_recent_day: string;
    comments_most_active_time: string;
    comments_spam: number;
    categories: number;
    tags: number;
    shares: number;
    shares_twitter?: number;
    shares_facebook?: number;
  };
  visits: {
    unit: string;
    fields: string[];
    data: Array<[string, number, number]>; // [date, views, visitors]
  };
}

/** Response from /sites/{id}/stats/insights */
export interface JetpackInsights {
  highest_hour: number;
  highest_hour_percent: number;
  highest_day_of_week: number;
  highest_day_percent: number;
  years?: Array<{
    year: string;
    total_posts: number;
    total_words: number;
    avg_words: number;
    total_likes: number;
    avg_likes: number;
    total_comments: number;
    avg_comments: number;
    total_images: number;
    avg_images: number;
  }>;
  posting_streak?: {
    streak: number;
    long_streak: number;
    long_streak_from: string;
    long_streak_to: string;
  };
}

/** Response from /sites/{id}/stats/highlights */
export interface JetpackHighlights {
  past_seven_days?: {
    views: number;
    visitors: number;
    likes: number;
    comments: number;
  };
  between_past_eight_and_fifteen_days?: {
    views: number;
    visitors: number;
    likes: number;
    comments: number;
  };
  past_thirty_days?: {
    views: number;
    visitors: number;
    likes: number;
    comments: number;
  };
  between_past_thirty_one_and_sixty_days?: {
    views: number;
    visitors: number;
    likes: number;
    comments: number;
  };
}

/** Response from /sites/{id}/stats/visits */
export interface JetpackVisits {
  unit: string;
  date: string;
  fields: string[];
  data: Array<[string, number, number]>; // [date, views, visitors]
}

/** Response from /sites/{id}/stats/clicks */
export interface JetpackClicks {
  date: string;
  days: Record<
    string,
    {
      clicks: Array<{
        name: string;
        url: string;
        icon: string;
        views: number;
        children?: Array<{
          name: string;
          url: string;
          views: number;
        }>;
      }>;
      other_clicks: number;
      total_clicks: number;
    }
  >;
}

/** Response from /sites/{id}/stats/country-views */
export interface JetpackCountryViews {
  date: string;
  days: Record<
    string,
    {
      views: Array<{
        country_code: string;
        views: number;
      }>;
      other_views: number;
      total_views: number;
    }
  >;
  'country-info': Record<
    string,
    {
      flag_icon: string;
      flat_flag_icon: string;
      country_full: string;
      map_region: string;
    }
  >;
}

/** Response from /sites/{id}/stats/referrers */
export interface JetpackReferrers {
  date: string;
  days: Record<
    string,
    {
      groups: Array<{
        name: string;
        url: string;
        icon: string;
        views: number;
        results?: Array<{
          name: string;
          url: string;
          views: number;
          children?: Array<{
            name: string;
            url: string;
            views: number;
          }>;
        }>;
      }>;
      other_views: number;
      total_views: number;
    }
  >;
}

/** Response from /sites/{id}/stats/top-posts */
export interface JetpackTopPosts {
  date: string;
  days: Record<
    string,
    {
      postviews: Array<{
        id: number;
        href: string;
        title: string;
        type: string;
        views: number;
      }>;
      total_views: number;
    }
  >;
}

/** Response from /sites/{id}/stats/search-terms */
export interface JetpackSearchTerms {
  date: string;
  days: Record<
    string,
    {
      search_terms: Array<{
        term: string;
        views: number;
      }>;
      encrypted_search_terms: number;
      other_search_terms: number;
      total_search_terms: number;
    }
  >;
}

// ============================================================================
// Aggregated Stats Type (for dashboard)
// ============================================================================

export interface JetpackStatsData {
  /** Whether Jetpack is connected and stats are available */
  available: boolean;
  /** Jetpack WordPress.com blog ID */
  blogId: number | null;
  /** General site statistics */
  stats: JetpackSiteStats | null;
  /** Posting insights (best hour/day) */
  insights: JetpackInsights | null;
  /** Quick highlights (7/30 day comparisons) */
  highlights: JetpackHighlights | null;
  /** Time series visits data */
  visits: JetpackVisits | null;
  /** Outbound click data */
  clicks: JetpackClicks | null;
  /** Views by country */
  countryViews: JetpackCountryViews | null;
  /** Traffic referrers */
  referrers: JetpackReferrers | null;
  /** Top performing posts */
  topPosts: JetpackTopPosts | null;
  /** Search terms driving traffic */
  searchTerms: JetpackSearchTerms | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildStatsParams(params: StatsParams = {}): Record<string, string> {
  const result: Record<string, string> = {};
  if (params.num !== undefined) result.num = String(params.num);
  if (params.period) result.period = params.period;
  if (params.date) result.date = params.date;
  if (params.max !== undefined) result.max = String(params.max);
  return result;
}

function buildVisitsParams(params: VisitsParams = {}): Record<string, string> {
  const result = buildStatsParams(params);
  if (params.unit) result.unit = params.unit;
  if (params.quantity !== undefined) result.quantity = String(params.quantity);
  return result;
}

// ============================================================================
// Individual Data Fetchers
// ============================================================================

async function fetchJetpackBlogId(site: WordPressSite): Promise<number | null> {
  const { rest_url, auth } = site;

  // Try the connection data endpoint first
  const connectionRes = await wpFetch<JetpackConnectionData>(
    rest_url,
    '/wp-json/jetpack/v4/connection/data',
    auth,
  );

  if (connectionRes.data?.wpcomBlogId) {
    return connectionRes.data.wpcomBlogId;
  }

  // Fallback: try the site endpoint
  const siteRes = await wpFetch<{ ID?: number; data?: string }>(
    rest_url,
    '/wp-json/jetpack/v4/site',
    auth,
  );

  // Jetpack can wrap the ID into a sub object
  let id = siteRes.data?.ID;
  if (!id && siteRes.data?.data) {
    const parsed = JSON.parse(siteRes.data.data);
    id = parsed.ID as number;
  }

  return id ?? null;
}

async function fetchJetpackStats(
  site: WordPressSite,
  blogId: number,
): Promise<JetpackSiteStats | null> {
  const res = await wpFetch<JetpackSiteStats>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats`,
    site.auth,
  );
  return res.data;
}

async function fetchJetpackInsights(
  site: WordPressSite,
  blogId: number,
): Promise<JetpackInsights | null> {
  const res = await wpFetch<JetpackInsights>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/insights`,
    site.auth,
  );
  return res.data;
}

async function fetchJetpackHighlights(
  site: WordPressSite,
  blogId: number,
  period: HighlightsPeriod = '7-days',
): Promise<JetpackHighlights | null> {
  const res = await wpFetch<JetpackHighlights>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/highlights`,
    site.auth,
    { period },
  );
  return res.data;
}

async function fetchJetpackVisits(
  site: WordPressSite,
  blogId: number,
  params: VisitsParams = { unit: 'day', quantity: 30 },
): Promise<JetpackVisits | null> {
  const res = await wpFetch<JetpackVisits>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/visits`,
    site.auth,
    buildVisitsParams(params),
  );
  return res.data;
}

async function fetchJetpackClicks(
  site: WordPressSite,
  blogId: number,
  params: StatsParams = { period: 'day', num: 7 },
): Promise<JetpackClicks | null> {
  const res = await wpFetch<JetpackClicks>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/clicks`,
    site.auth,
    buildStatsParams(params),
  );
  return res.data;
}

async function fetchJetpackCountryViews(
  site: WordPressSite,
  blogId: number,
  params: StatsParams = { period: 'day', num: 7 },
): Promise<JetpackCountryViews | null> {
  const res = await wpFetch<JetpackCountryViews>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/country-views`,
    site.auth,
    buildStatsParams(params),
  );
  return res.data;
}

async function fetchJetpackReferrers(
  site: WordPressSite,
  blogId: number,
  params: StatsParams = { period: 'day', num: 7 },
): Promise<JetpackReferrers | null> {
  const res = await wpFetch<JetpackReferrers>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/referrers`,
    site.auth,
    buildStatsParams(params),
  );
  return res.data;
}

async function fetchJetpackTopPosts(
  site: WordPressSite,
  blogId: number,
  params: StatsParams = { period: 'day', num: 7, max: 10 },
): Promise<JetpackTopPosts | null> {
  const res = await wpFetch<JetpackTopPosts>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/top-posts`,
    site.auth,
    buildStatsParams(params),
  );
  return res.data;
}

async function fetchJetpackSearchTerms(
  site: WordPressSite,
  blogId: number,
  params: StatsParams = { period: 'day', num: 7 },
): Promise<JetpackSearchTerms | null> {
  const res = await wpFetch<JetpackSearchTerms>(
    site.rest_url,
    `/wp-json/jetpack/v4/stats-app/sites/${blogId}/stats/search-terms`,
    site.auth,
    buildStatsParams(params),
  );
  return res.data;
}

// ============================================================================
// Hooks - Individual Stats
// ============================================================================

/**
 * Fetch the Jetpack WordPress.com blog ID for a site.
 * This is required before fetching any stats.
 */
export function useJetpackBlogId(site: WordPressSite | null) {
  return useQuery({
    queryKey: jetpackStatsKeys.siteId(site?.id ?? 'none'),
    queryFn: () => (site ? fetchJetpackBlogId(site) : Promise.resolve(null)),
    enabled: !!site,
    staleTime: 24 * 60 * 60 * 1000, // Blog ID rarely changes, cache 24h
    retry: 1,
  });
}

// ============================================================================
// Hooks - Combined Stats (for dashboard)
// ============================================================================

export interface UseJetpackStatsOptions {
  /** Period for highlights comparison */
  highlightsPeriod?: HighlightsPeriod;
  /** Params for time series visits */
  visitsParams?: VisitsParams;
  /** Params for stats that support period/num */
  statsParams?: StatsParams;
  /** Which stats to fetch (defaults to all) */
  include?: {
    stats?: boolean;
    insights?: boolean;
    highlights?: boolean;
    visits?: boolean;
    clicks?: boolean;
    countryViews?: boolean;
    referrers?: boolean;
    topPosts?: boolean;
    searchTerms?: boolean;
  };
}

const defaultInclude = {
  stats: true,
  insights: true,
  highlights: true,
  visits: true,
  clicks: true,
  countryViews: true,
  referrers: true,
  topPosts: true,
  searchTerms: true,
};

/**
 * Fetch all Jetpack stats for a site in parallel.
 * First resolves the blog ID, then fetches all enabled stats.
 */
export function useJetpackStats(
  site: WordPressSite | null,
  options: UseJetpackStatsOptions = {},
) {
  const {
    highlightsPeriod = '7-days',
    visitsParams = { unit: 'day', quantity: 30 },
    statsParams = { period: 'day', num: 7 },
    include = defaultInclude,
  } = options;

  // First, get the blog ID
  const blogIdQuery = useJetpackBlogId(site);
  const blogId = blogIdQuery.data;

  // Define queries for each stat type
  const queries = useQueries({
    queries: [
      {
        queryKey: jetpackStatsKeys.stats(site?.id ?? 'none'),
        queryFn: () =>
          site && blogId ? fetchJetpackStats(site, blogId) : null,
        enabled: !!site && !!blogId && include.stats !== false,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.insights(site?.id ?? 'none'),
        queryFn: () =>
          site && blogId ? fetchJetpackInsights(site, blogId) : null,
        enabled: !!site && !!blogId && include.insights !== false,
        staleTime: 60 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.highlights(
          site?.id ?? 'none',
          highlightsPeriod,
        ),
        queryFn: () =>
          site && blogId
            ? fetchJetpackHighlights(site, blogId, highlightsPeriod)
            : null,
        enabled: !!site && !!blogId && include.highlights !== false,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.visits(site?.id ?? 'none', visitsParams),
        queryFn: () =>
          site && blogId
            ? fetchJetpackVisits(site, blogId, visitsParams)
            : null,
        enabled: !!site && !!blogId && include.visits !== false,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.clicks(site?.id ?? 'none', statsParams),
        queryFn: () =>
          site && blogId ? fetchJetpackClicks(site, blogId, statsParams) : null,
        enabled: !!site && !!blogId && include.clicks !== false,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.countryViews(
          site?.id ?? 'none',
          statsParams,
        ),
        queryFn: () =>
          site && blogId
            ? fetchJetpackCountryViews(site, blogId, statsParams)
            : null,
        enabled: !!site && !!blogId && include.countryViews !== false,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.referrers(site?.id ?? 'none', statsParams),
        queryFn: () =>
          site && blogId
            ? fetchJetpackReferrers(site, blogId, statsParams)
            : null,
        enabled: !!site && !!blogId && include.referrers !== false,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.topPosts(site?.id ?? 'none', {
          ...statsParams,
          max: 10,
        }),
        queryFn: () =>
          site && blogId
            ? fetchJetpackTopPosts(site, blogId, { ...statsParams, max: 10 })
            : null,
        enabled: !!site && !!blogId && include.topPosts !== false,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: jetpackStatsKeys.searchTerms(site?.id ?? 'none', statsParams),
        queryFn: () =>
          site && blogId
            ? fetchJetpackSearchTerms(site, blogId, statsParams)
            : null,
        enabled: !!site && !!blogId && include.searchTerms !== false,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [
    statsQuery,
    insightsQuery,
    highlightsQuery,
    visitsQuery,
    clicksQuery,
    countryViewsQuery,
    referrersQuery,
    topPostsQuery,
    searchTermsQuery,
  ] = queries;

  const isLoading = blogIdQuery.isLoading || queries.some((q) => q.isLoading);
  const isError = blogIdQuery.isError || queries.some((q) => q.isError);
  const isFetching =
    blogIdQuery.isFetching || queries.some((q) => q.isFetching);

  const data: JetpackStatsData = {
    available: !!blogId,
    blogId: blogId ?? null,
    stats: statsQuery.data ?? null,
    insights: insightsQuery.data ?? null,
    highlights: highlightsQuery.data ?? null,
    visits: visitsQuery.data ?? null,
    clicks: clicksQuery.data ?? null,
    countryViews: countryViewsQuery.data ?? null,
    referrers: referrersQuery.data ?? null,
    topPosts: topPostsQuery.data ?? null,
    searchTerms: searchTermsQuery.data ?? null,
  };

  return {
    data,
    isLoading,
    isError,
    isFetching,
    blogIdQuery,
    queries: {
      stats: statsQuery,
      insights: insightsQuery,
      highlights: highlightsQuery,
      visits: visitsQuery,
      clicks: clicksQuery,
      countryViews: countryViewsQuery,
      referrers: referrersQuery,
      topPosts: topPostsQuery,
      searchTerms: searchTermsQuery,
    },
  };
}
