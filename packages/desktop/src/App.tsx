import { useState, useEffect } from 'react';
import { useSites } from './hooks/useSites';
import { useOpenCode } from './hooks/useOpenCode';
import { useDeepLink } from './hooks/useDeepLink';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { Onboarding } from './components/Onboarding';
import { SiteDashboard } from './components/SiteDashboard';
import { OpenCodeView } from './components/OpenCodeView';

type ViewMode = 'dashboard' | 'opencode';

function App() {
  const {
    sites,
    activeSite,
    isLoading: isSitesLoading,
    error: sitesError,
    connectSite,
    setActive,
    removeSite,
  } = useSites();

  const opencode = useOpenCode();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useDeepLink(async (payload) => {
    try {
      await connectSite(payload.site_url, payload.token);
    } catch (e) {
      console.error('Deep link connection failed', e);
    }
  });

  useEffect(() => {
    if (activeSite) {
      setShowOnboarding(false);
      setViewMode('dashboard');
    }
  }, [activeSite]);

  const handleConnect = async (url: string) => {
    let siteUrl = url;
    let token = '';

    if (url.startsWith('wordforge://')) {
      const urlObj = new URL(url.replace('wordforge://', 'http://'));
      siteUrl = urlObj.searchParams.get('site') || '';
      token = urlObj.searchParams.get('token') || '';
    }

    if (siteUrl && token) {
      await connectSite(siteUrl, token);
    } else {
      throw new Error('Invalid connection URL');
    }
  };

  const handleStartAndOpen = async () => {
    await opencode.start();
    setViewMode('opencode');
  };

  const dashboardOpencode = {
    ...opencode,
    start: handleStartAndOpen,
    openView: async () => setViewMode('opencode'),
  };

  const renderContent = () => {
    if (viewMode === 'opencode' && opencode.status === 'running') {
      return (
        <OpenCodeView
          opencode={opencode}
          siteName={activeSite?.name || 'Unknown Site'}
          onBack={() => setViewMode('dashboard')}
        />
      );
    }

    if (activeSite && !showOnboarding) {
      return (
        <SiteDashboard
          site={activeSite}
          opencode={dashboardOpencode}
          onRemove={() => removeSite(activeSite.id)}
        />
      );
    }

    return (
      <Onboarding
        onConnect={handleConnect}
        isLoading={isSitesLoading}
        error={sitesError}
      />
    );
  };

  return (
    <div className="app">
      <Header
        sites={sites}
        activeSite={activeSite}
        onSelectSite={(id) => {
          setActive(id);
          setShowOnboarding(false);
        }}
        onAddSite={() => setShowOnboarding(true)}
        onOpenSettings={() => {}}
      />

      <main className="app-main">{renderContent()}</main>

      <StatusBar opencode={opencode} siteConnected={!!activeSite} />
    </div>
  );
}

export default App;
