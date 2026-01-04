import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Onboarding } from '../components/Onboarding';
import { useSiteMutations } from '../hooks/useSites';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const navigate = useNavigate();
  const { connectSite, isConnecting, connectError } = useSiteMutations();

  const handleConnect = async (url: string) => {
    let siteUrl = url;
    let token = '';

    if (url.startsWith('wordforge://')) {
      const urlObj = new URL(url.replace('wordforge://', 'http://'));
      siteUrl = urlObj.searchParams.get('site') || '';
      token = urlObj.searchParams.get('token') || '';
    }

    if (siteUrl && token) {
      const site = await connectSite({ siteUrl, token });
      navigate({ to: '/site/$siteId', params: { siteId: site.id } });
    } else {
      throw new Error('Invalid connection URL');
    }
  };

  return (
    <Onboarding
      onConnect={handleConnect}
      isLoading={isConnecting}
      error={connectError}
    />
  );
}
