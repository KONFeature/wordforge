import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { OpenCodeClientProvider } from '../../context/OpenCodeClientContext';
import type { WordPressSite } from '../../types';

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

  return (
    <OpenCodeClientProvider site={site}>
      <Outlet />
    </OpenCodeClientProvider>
  );
}
