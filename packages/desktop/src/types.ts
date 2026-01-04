import type { ProviderConfig } from '@opencode-ai/sdk/v2/client';

export interface WordPressSite {
  id: string;
  name: string;
  url: string;
  rest_url: string;
  mcp_endpoint: string;
  abilities_url: string;
  username: string;
  app_password: string;
  auth: string;
  project_dir: string;
  created_at: number;
  last_used_at: number;
  config_hash?: string;
  config_updated_at?: number;
}

export interface ConfigSyncStatus {
  update_available: boolean;
  current_hash: string | null;
  remote_hash: string | null;
  last_checked: number | null;
}

export interface DeepLinkPayload {
  url: string;
  site: string;
  token: string;
  name: string;
}

// WordPress REST API response types
export interface WPSiteInfo {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  timezone_string: string;
  namespaces: string[];
}

type WPRenderedField = string | { raw: string; rendered: string };

export interface WPTheme {
  name: WPRenderedField;
  version: WPRenderedField;
  author: WPRenderedField;
  theme_uri: string;
  is_block_theme: boolean;
  stylesheet: string;
}

export interface WPPlugin {
  plugin: string;
  status: 'active' | 'inactive';
  name: WPRenderedField;
  version: string;
  author: WPRenderedField;
  description: WPRenderedField;
  update?: { version: string };
}

export interface WPPost {
  id: number;
  date: string;
  modified: string;
  title: { rendered: string };
  status: string;
}

export interface WPTemplate {
  id: string;
  slug: string;
  title: { rendered: string };
  source: string;
  has_theme_file: boolean;
}

export interface WPComment {
  id: number;
  date: string;
  status: 'approved' | 'hold' | 'spam' | 'trash';
  author_name: string;
  content: { rendered: string };
}

export interface WPMedia {
  id: number;
  date: string;
  title: { rendered: string };
  media_type: string;
}

export interface WPUser {
  id: number;
  name: string;
  roles: string[];
}

// WooCommerce types
export interface WCProduct {
  id: number;
  name: string;
  status: string;
  price: string;
  stock_status: string;
}

export interface WCOrder {
  id: number;
  status: string;
  total: string;
  date_created: string;
  currency: string;
}

export interface WCSystemStatus {
  environment: {
    wp_version: string;
    php_version: string;
  };
}

// Aggregated site statistics
export interface SiteStats {
  siteInfo: {
    wordpressVersion: string | null;
    phpVersion: string | null;
    language: string;
    timezone: string;
  } | null;

  theme: {
    name: string;
    version: string;
    isBlockTheme: boolean;
  } | null;

  content: {
    posts: { total: number; published: number };
    pages: { total: number; published: number };
    media: number;
    comments: { total: number; pending: number };
  } | null;

  users: {
    total: number;
    admins: number;
  } | null;

  plugins: {
    total: number;
    active: number;
    updatesAvailable: number;
    list: Array<{ name: string; version: string; updateAvailable: boolean }>;
  } | null;

  recentPosts: Array<{
    id: number;
    title: string;
    date: string;
    status: string;
  }> | null;

  templates: {
    total: number;
    customized: number;
  } | null;

  woocommerce: {
    products: { total: number; published: number };
    orders: {
      total: number;
      processing: number;
      completed: number;
      revenue: { total: number; currency: string };
    };
  } | null;

  analytics: {
    visitors: { today: number; yesterday: number; week: number };
    views: { today: number; yesterday: number; week: number };
  } | null;
}

export interface SiteStatsProps {
  stats: SiteStats | null | undefined;
  isLoading: boolean;
}

export interface OpenCodePlugin {
  id: string;
  name: string;
  description: string;
  models: string;
  packageName: string;
  github: string;
  /** Provider configuration to add when this plugin is enabled */
  providerConfig?: {
    [key: string]: ProviderConfig;
  };
}
