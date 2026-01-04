import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useState } from 'react';
import { Button, Card, Input, StepCard } from '../components/ui';
import { useSidebarNavItems } from '../context/SidebarContext';
import { useSiteMutations } from '../hooks/useSites';
import styles from './onboarding.module.css';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const navigate = useNavigate();
  const { connectSite, isConnecting, connectError } = useSiteMutations();
  const { setNavItems } = useSidebarNavItems();
  const [url, setUrl] = useState('');

  useEffect(() => {
    setNavItems([]);
    return () => setNavItems([]);
  }, [setNavItems]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) return;

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
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to WordForge</h1>
          <p className={styles.subtitle}>
            Connect your WordPress site to get started
          </p>
        </div>

        <StepCard
          step={1}
          title="Install WordForge Plugin"
          description="Install and activate the WordForge plugin on your WordPress site."
        />

        <StepCard
          step={2}
          title="Connect Desktop App"
          description="Go to WordForge → Settings → Local Connection and click 'Open in Desktop App'."
        />

        <div className={styles.divider}>
          <span>OR PASTE CONNECTION LINK</span>
        </div>

        <Card>
          <form onSubmit={handleConnect} className={styles.form}>
            <Input
              placeholder="wordforge://connect?..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isConnecting}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isConnecting}
              disabled={!url.trim()}
              className={styles.submitBtn}
            >
              Connect Manually
            </Button>
          </form>
        </Card>

        {connectError && <div className={styles.error}>{connectError}</div>}
      </div>
    </div>
  );
}
