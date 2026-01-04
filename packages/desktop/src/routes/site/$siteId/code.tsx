import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { OpenCodeView } from '../../../components/OpenCodeView';

export const Route = createFileRoute('/site/$siteId/code')({
  component: OpenCodeRoute,
});

function OpenCodeRoute() {
  const navigate = useNavigate();
  const { siteId } = Route.useParams();
  const { site } = Route.useRouteContext();

  const handleBack = () => {
    navigate({ to: '/site/$siteId', params: { siteId } });
  };

  return <OpenCodeView siteName={site.name} onBack={handleBack} />;
}
