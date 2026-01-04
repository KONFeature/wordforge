import { useNavigate } from '@tanstack/react-router';
import { Settings, Sparkles } from 'lucide-react';
import type { WordPressSite } from '../types';
import { SiteSelector } from './SiteSelector';

interface HeaderProps {
  sites: WordPressSite[];
  activeSite: WordPressSite | null;
  onSelectSite: (id: string) => void;
  onOpenSettings: () => void;
}

export function Header({
  sites,
  activeSite,
  onSelectSite,
  onOpenSettings,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleSelectSite = (id: string) => {
    onSelectSite(id);
    navigate({ to: '/site/$siteId', params: { siteId: id } });
  };

  const handleAddSite = () => {
    navigate({ to: '/onboarding' });
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <Sparkles className="logo-icon" size={24} />
          <span className="logo-text">WordForge</span>
        </div>
        <SiteSelector
          sites={sites}
          activeSite={activeSite}
          onSelect={handleSelectSite}
          onAdd={handleAddSite}
        />
      </div>
      <div className="header-right">
        <button
          type="button"
          className="btn-icon"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
