import { useQuery } from '@tanstack/react-query';
import { wpFetch } from '../lib/wpFetch';
import type {
  SiteStats,
  WCOrder,
  WCProduct,
  WCSystemStatus,
  WPComment,
  WPMedia,
  WPPlugin,
  WPPost,
  WPSiteInfo,
  WPTemplate,
  WPTheme,
  WPUser,
  WordPressSite,
} from '../types';

const statsKeys = {
  all: ['site-stats'] as const,
  site: (siteId: string) => [...statsKeys.all, siteId] as const,
};

interface JetpackStats {
  visits?: { data?: Array<[string, number]> };
  visitors?: { data?: Array<[string, number]> };
}

async function fetchSiteStats(site: WordPressSite): Promise<SiteStats> {
  const { rest_url, auth } = site;

  const [
    siteInfoRes,
    themeRes,
    postsRes,
    recentPostsRes,
    templatesRes,
    pagesRes,
    mediaRes,
    commentsRes,
    pendingCommentsRes,
    usersRes,
    pluginsRes,
    wcStatusRes,
    wcProductsRes,
    wcOrdersRes,
    wcRecentOrdersRes,
    jetpackStatsRes,
  ] = await Promise.all([
    wpFetch<WPSiteInfo>(rest_url, '/wp-json', auth),
    wpFetch<WPTheme[]>(rest_url, '/wp-json/wp/v2/themes', auth),
    wpFetch<WPPost[]>(rest_url, '/wp-json/wp/v2/posts', auth, {
      per_page: '1',
      status: 'publish',
    }),
    wpFetch<WPPost[]>(rest_url, '/wp-json/wp/v2/posts', auth, {
      per_page: '5',
      orderby: 'modified',
      order: 'desc',
    }),
    wpFetch<WPTemplate[]>(rest_url, '/wp-json/wp/v2/templates', auth),
    wpFetch<WPPost[]>(rest_url, '/wp-json/wp/v2/pages', auth, {
      per_page: '1',
      status: 'publish',
    }),
    wpFetch<WPMedia[]>(rest_url, '/wp-json/wp/v2/media', auth, {
      per_page: '1',
    }),
    wpFetch<WPComment[]>(rest_url, '/wp-json/wp/v2/comments', auth, {
      per_page: '1',
    }),
    wpFetch<WPComment[]>(rest_url, '/wp-json/wp/v2/comments', auth, {
      per_page: '1',
      status: 'hold',
    }),
    wpFetch<WPUser[]>(rest_url, '/wp-json/wp/v2/users', auth, {
      per_page: '100',
    }),
    wpFetch<WPPlugin[]>(rest_url, '/wp-json/wp/v2/plugins', auth),
    wpFetch<WCSystemStatus>(rest_url, '/wp-json/wc/v3/system_status', auth),
    wpFetch<WCProduct[]>(rest_url, '/wp-json/wc/v3/products', auth, {
      per_page: '1',
      status: 'publish',
    }),
    wpFetch<WCOrder[]>(rest_url, '/wp-json/wc/v3/orders', auth, {
      per_page: '1',
    }),
    wpFetch<WCOrder[]>(rest_url, '/wp-json/wc/v3/orders', auth, {
      per_page: '100',
      after: getMonthAgoDate(),
    }),
    wpFetch<JetpackStats>(
      rest_url,
      '/wp-json/jetpack/v4/module/stats/data',
      auth,
      {
        range: 'week',
      },
    ),
  ]);

  const activeTheme = themeRes.data?.find((t) => t.stylesheet);
  const hasWooCommerce = !wcStatusRes.error && wcStatusRes.data;

  let wcRevenue = 0;
  let wcCurrency = 'USD';
  let wcProcessing = 0;
  let wcCompleted = 0;

  if (wcRecentOrdersRes.data) {
    for (const order of wcRecentOrdersRes.data) {
      if (order.status === 'completed' || order.status === 'processing') {
        wcRevenue += Number.parseFloat(order.total) || 0;
      }
      if (order.status === 'processing') wcProcessing++;
      if (order.status === 'completed') wcCompleted++;
      wcCurrency = order.currency || wcCurrency;
    }
  }

  const adminCount =
    usersRes.data?.filter((u) => u.roles?.includes('administrator')).length ??
    0;
  const activePlugins =
    pluginsRes.data?.filter((p) => p.status === 'active') ?? [];

  return {
    siteInfo: siteInfoRes.data
      ? {
          wordpressVersion: wcStatusRes.data?.environment?.wp_version ?? null,
          phpVersion: wcStatusRes.data?.environment?.php_version ?? null,
          language: extractLanguage(siteInfoRes.data),
          timezone:
            siteInfoRes.data.timezone_string ||
            `GMT${siteInfoRes.data.gmt_offset}`,
        }
      : null,

    theme: activeTheme
      ? {
          name: getString(activeTheme.name),
          version: getString(activeTheme.version),
          isBlockTheme: activeTheme.is_block_theme,
        }
      : null,

    content: {
      posts: { total: postsRes.total ?? 0, published: postsRes.total ?? 0 },
      pages: { total: pagesRes.total ?? 0, published: pagesRes.total ?? 0 },
      media: mediaRes.total ?? 0,
      comments: {
        total: commentsRes.total ?? 0,
        pending: pendingCommentsRes.total ?? 0,
      },
    },

    users: usersRes.data
      ? {
          total: usersRes.data.length,
          admins: adminCount,
        }
      : null,

    plugins: pluginsRes.data
      ? {
          total: pluginsRes.data.length,
          active: activePlugins.length,
          updatesAvailable: pluginsRes.data.filter((p) => p.update).length,
          list: activePlugins.slice(0, 15).map((p) => ({
            name: getString(p.name),
            version: getString(p.version),
            updateAvailable: !!p.update,
          })),
        }
      : null,

    recentPosts: recentPostsRes.data
      ? recentPostsRes.data.map((p) => ({
          id: p.id,
          title: getString(p.title),
          date: p.modified || p.date,
          status: p.status,
        }))
      : null,

    templates: templatesRes.data
      ? {
          total: templatesRes.data.length,
          customized: templatesRes.data.filter((t) => t.source === 'custom')
            .length,
        }
      : null,

    woocommerce: hasWooCommerce
      ? {
          products: {
            total: wcProductsRes.total ?? 0,
            published: wcProductsRes.total ?? 0,
          },
          orders: {
            total: wcOrdersRes.total ?? 0,
            processing: wcProcessing,
            completed: wcCompleted,
            revenue: { total: wcRevenue, currency: wcCurrency },
          },
        }
      : null,

    analytics: parseJetpackStats(jetpackStatsRes.data),
  };
}

function parseJetpackStats(data: JetpackStats | null): SiteStats['analytics'] {
  if (!data?.visits?.data && !data?.visitors?.data) return null;

  const visits = data.visits?.data || [];
  const visitors = data.visitors?.data || [];

  const sumLast = (arr: Array<[string, number]>, days: number) =>
    arr.slice(-days).reduce((sum, [, val]) => sum + (val || 0), 0);

  const getLast = (arr: Array<[string, number]>, index: number) =>
    arr[arr.length - 1 - index]?.[1] || 0;

  return {
    visitors: {
      today: getLast(visitors, 0),
      yesterday: getLast(visitors, 1),
      week: sumLast(visitors, 7),
    },
    views: {
      today: getLast(visits, 0),
      yesterday: getLast(visits, 1),
      week: sumLast(visits, 7),
    },
  };
}

function getMonthAgoDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString();
}

function extractLanguage(siteInfo: WPSiteInfo): string {
  const ns = siteInfo.namespaces || [];
  if (ns.includes('wp/v2')) {
    return 'en_US';
  }
  return 'en_US';
}

function getString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.rendered === 'string') return obj.rendered;
    if (typeof obj.raw === 'string') return obj.raw;
  }
  return String(value ?? '');
}

export function useSiteStats(site: WordPressSite | null) {
  return useQuery({
    queryKey: statsKeys.site(site?.id ?? 'none'),
    queryFn: () => (site ? fetchSiteStats(site) : Promise.resolve(null)),
    enabled: !!site,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
