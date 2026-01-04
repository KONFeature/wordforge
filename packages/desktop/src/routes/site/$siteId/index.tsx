import { createFileRoute } from '@tanstack/react-router';
import { SiteDashboard } from '../../../components/SiteDashboard';

export const Route = createFileRoute('/site/$siteId/')({
  component: SiteDashboardRoute,
});

function SiteDashboardRoute() {
  const { site } = Route.useRouteContext();

  return <SiteDashboard site={site} />;
}
