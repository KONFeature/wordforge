import { Sparkles, Settings } from 'lucide-react';
import { SiteSelector } from './SiteSelector';
import type { WordPressSite } from '../types';

interface HeaderProps {
  sites: WordPressSite[];
  activeSite: WordPressSite | null;
  onSelectSite: (id: string) => void;
  onAddSite: () => void;
  onOpenSettings: () => void;
}

export function Header({
  sites,
  activeSite,
  onSelectSite,
  onAddSite,
  onOpenSettings,
}: HeaderProps) {
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
          onSelect={onSelectSite}
          onAdd={onAddSite}
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
