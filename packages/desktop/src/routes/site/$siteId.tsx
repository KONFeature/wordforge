import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { createSiteNavItems } from '../../components/ui';
import { OpenCodeClientProvider } from '../../context/OpenCodeClientContext';
import { useSidebarNavItems } from '../../context/SidebarContext';
import { useSiteStats } from '../../hooks/useSiteStats';
import type { WordPressSite } from '../../types';
import styles from './siteId.module.css';

export const Route = createFileRoute('/site/$siteId')({
  beforeLoad: async ({ params }) => {
    const sites = await invoke<WordPressSite[]>('list_sites');
    const site = sites.find((s) => s.id === params.siteId);

    if (!site) {
      throw redirect({ to: '/onboarding' });
    }

    const currentActive = await invoke<WordPressSite | null>('get_active_site');
    if (currentActive?.id !== site.id) {
      await invoke('set_active_site', { id: site.id });
    }

    return { site };
  },
  loader: ({ context }) => context,
  component: SiteLayout,
});

function SiteLayout() {
  const { site } = Route.useLoaderData();
  const { data: stats } = useSiteStats(site);
  const { setNavItems } = useSidebarNavItems();

  useEffect(() => {
    const navItems = createSiteNavItems(site.id, {
      hasWooCommerce: !!stats?.woocommerce,
      hasAnalytics: !!stats?.analytics,
    });
    setNavItems(navItems);

    return () => setNavItems([]);
  }, [site.id, stats?.woocommerce, stats?.analytics, setNavItems]);

  return (
    <OpenCodeClientProvider site={site}>
      <div className={styles.content}>
        <Outlet />
      </div>
    </OpenCodeClientProvider>
  );
}
