import { Link, useLocation } from '@tanstack/react-router';
import {
  BarChart2,
  Bug,
  ChevronDown,
  Download,
  Home,
  Play,
  Plus,
  Settings as SettingsIcon,
  ShoppingCart,
  Square,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import logoWordforge from '../../assets/logo-wordforge.webp';
import {
  useOpenCodeActions,
  useOpenCodeDownload,
  useOpenCodeStatus,
} from '../../hooks/useOpenCode';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from './Dropdown';
import { Progress } from './Progress';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  sites: Array<{ id: string; name: string; url: string }>;
  activeSite?: { id: string; name: string; url: string } | null;
  onSelectSite: (id: string) => void;
  onAddSite: () => void;
  navItems?: NavItem[];
  children?: ReactNode;
}

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  params?: Record<string, string>;
}

export function Sidebar({
  sites,
  activeSite,
  onSelectSite,
  onAddSite,
  navItems,
  children,
}: SidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <img src={logoWordforge} alt="WordForge" width={20} height={20} />
          <span>WordForge</span>
        </div>
      </div>

      <div className={styles.siteSelector}>
        <Dropdown open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownTrigger asChild>
            <button type="button" className={styles.siteSelectorBtn}>
              {activeSite ? (
                <>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${activeSite.url}&sz=32`}
                    alt=""
                    className={styles.favicon}
                  />
                  <div className={styles.siteInfo}>
                    <span className={styles.siteName}>{activeSite.name}</span>
                    <span className={styles.siteUrl}>
                      {new URL(activeSite.url).host}
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.siteInfo}>
                  <span className={styles.siteName}>Select a site</span>
                  <span className={styles.siteUrl}>No site connected</span>
                </div>
              )}
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${dropdownOpen ? styles.open : ''}`}
              />
            </button>
          </DropdownTrigger>
          <DropdownContent align="start" className={styles.dropdown}>
            {sites.length > 0 ? (
              sites.map((site) => (
                <DropdownItem
                  key={site.id}
                  className={site.id === activeSite?.id ? styles.active : ''}
                  onSelect={() => {
                    onSelectSite(site.id);
                    setDropdownOpen(false);
                  }}
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${site.url}&sz=32`}
                    alt=""
                    className={styles.favicon}
                  />
                  <div className={styles.dropdownSiteInfo}>
                    <span className={styles.dropdownSiteName}>{site.name}</span>
                    <span className={styles.dropdownSiteUrl}>
                      {new URL(site.url).host}
                    </span>
                  </div>
                </DropdownItem>
              ))
            ) : (
              <div className={styles.noSites}>No sites connected</div>
            )}
            <DropdownSeparator />
            <DropdownItem
              onSelect={() => {
                onAddSite();
                setDropdownOpen(false);
              }}
              className={styles.addSite}
            >
              <Plus size={16} />
              <span>Add Site</span>
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>

      {navItems && navItems.length > 0 && (
        <nav className={styles.nav}>
          <div className={styles.navLabel}>Menu</div>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive = item.params
                ? location.pathname ===
                  item.to.replace('$siteId', item.params.siteId || '')
                : location.pathname === item.to;

              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    params={item.params}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {children && <div className={styles.content}>{children}</div>}

      <div className={styles.footer}>
        <OpenCodeControls />
        <Link
          to="/debug"
          className={`${styles.footerLink} ${location.pathname === '/debug' ? styles.footerLinkActive : ''}`}
        >
          <Bug size={18} />
          <span>Debug</span>
        </Link>
        <Link
          to="/settings"
          className={`${styles.footerLink} ${location.pathname === '/settings' ? styles.footerLinkActive : ''}`}
        >
          <SettingsIcon size={18} />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}

function OpenCodeControls() {
  const { status, port } = useOpenCodeStatus();
  const { start, stop, isStarting } = useOpenCodeActions();
  const { download, isDownloading, downloadProgress } = useOpenCodeDownload();

  const isInstalled = status !== 'not_installed';
  const isRunning = status === 'running';
  const isStartingStatus = status === 'starting' || isStarting;

  if (isDownloading) {
    return (
      <div className={styles.openCodeSection}>
        <Progress
          value={downloadProgress?.percent || 0}
          label={downloadProgress?.message || 'Downloading...'}
          showValue
        />
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className={styles.openCodeSection}>
        <button
          type="button"
          className={styles.openCodeDownloadBtn}
          onClick={() => download()}
        >
          <Download size={16} />
          <span>Download OpenCode</span>
        </button>
      </div>
    );
  }

  const statusClass = isRunning
    ? styles.statusRunning
    : isStartingStatus
      ? styles.statusStarting
      : styles.statusStopped;

  const statusLabel = isRunning
    ? `Running${port ? ` :${port}` : ''}`
    : isStartingStatus
      ? 'Starting...'
      : 'Stopped';

  return (
    <div className={styles.openCodeSection}>
      <div className={styles.openCodeRow}>
        <div className={styles.openCodeStatus}>
          <span className={`${styles.statusDot} ${statusClass}`} />
          <span className={styles.statusLabel}>{statusLabel}</span>
        </div>
        <div className={styles.openCodeActions}>
          {isRunning ? (
            <button
              type="button"
              className={styles.openCodeBtn}
              onClick={() => stop()}
              title="Stop OpenCode"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              type="button"
              className={styles.openCodeBtn}
              onClick={() => start()}
              disabled={isStartingStatus}
              title="Start OpenCode"
            >
              <Play size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function createSiteNavItems(siteId: string): NavItem[] {
  return [
    {
      to: '/site/$siteId',
      label: 'Home',
      icon: <Home size={18} />,
      params: { siteId },
    },
    {
      to: '/site/$siteId/woocommerce',
      label: 'Commerce',
      icon: <ShoppingCart size={18} />,
      params: { siteId },
    },
    {
      to: '/site/$siteId/analytics',
      label: 'Analytics',
      icon: <BarChart2 size={18} />,
      params: { siteId },
    },
    {
      to: '/site/$siteId/system',
      label: 'System',
      icon: <SettingsIcon size={18} />,
      params: { siteId },
    },
  ];
}
