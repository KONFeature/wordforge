import { Outlet, createRootRoute, useNavigate } from '@tanstack/react-router';
import { AppStatusBar, Sidebar, SidebarLayout } from '../components/ui';
import { SidebarProvider, useSidebarNavItems } from '../context/SidebarContext';
import { useDeepLink } from '../hooks/useDeepLink';
import { useOpenCodeStatus } from '../hooks/useOpenCode';
import {
  useActiveSite,
  useSiteMutations,
  useSitesList,
} from '../hooks/useSites';
import '../styles/variables.css';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <SidebarProvider>
      <RootLayoutInner />
    </SidebarProvider>
  );
}

function RootLayoutInner() {
  const navigate = useNavigate();
  const { sites } = useSitesList();
  const { activeSite } = useActiveSite();
  const { setActive, connectSite } = useSiteMutations();
  const { status, port, installedVersion } = useOpenCodeStatus();
  const { navItems } = useSidebarNavItems();

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

  const handleSelectSite = (id: string) => {
    setActive(id);
    navigate({ to: '/site/$siteId', params: { siteId: id } });
  };

  const handleAddSite = () => {
    navigate({ to: '/onboarding' });
  };

  const sidebar = (
    <Sidebar
      sites={sites}
      activeSite={activeSite}
      onSelectSite={handleSelectSite}
      onAddSite={handleAddSite}
      navItems={navItems}
    />
  );

  const statusBar = (
    <AppStatusBar
      openCodeStatus={status}
      openCodePort={port}
      openCodeVersion={installedVersion}
      siteConnected={!!activeSite}
    />
  );

  return (
    <SidebarLayout sidebar={sidebar} statusBar={statusBar}>
      <Outlet />
    </SidebarLayout>
  );
}
