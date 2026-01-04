import { Link, useLocation } from '@tanstack/react-router';
import {
  BarChart2,
  ChevronDown,
  Home,
  Plus,
  Settings,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from './Dropdown';
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
          <Sparkles size={20} />
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
      icon: <Settings size={18} />,
      params: { siteId },
    },
  ];
}
