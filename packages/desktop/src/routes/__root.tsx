import { Outlet, createRootRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { StatusBar } from '../components/StatusBar';
import { useDeepLink } from '../hooks/useDeepLink';
import { useOpenCodeStatus } from '../hooks/useOpenCode';
import {
  useActiveSite,
  useSiteMutations,
  useSitesList,
} from '../hooks/useSites';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();
  const { sites } = useSitesList();
  const { activeSite } = useActiveSite();
  const { setActive, connectSite } = useSiteMutations();
  const { status, port, installedVersion } = useOpenCodeStatus();

  useDeepLink(async (payload) => {
    try {
      const site = await connectSite({
        siteUrl: payload.site,
        token: payload.token,
      });
      navigate({ to: '/site/$siteId', params: { siteId: site.id } });
    } catch (e) {
      console.error('Deep link connection failed', e);
    }
  });

  return (
    <div className="app">
      <Header
        sites={sites}
        activeSite={activeSite}
        onSelectSite={setActive}
        onOpenSettings={() => {}}
      />

      <main className="app-main">
        <Outlet />
      </main>

      <StatusBar
        status={status}
        port={port}
        installedVersion={installedVersion}
        siteConnected={!!activeSite}
      />
    </div>
  );
}
