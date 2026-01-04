import { type ReactNode, createContext, useContext, useState } from 'react';
import type { NavItem } from '../components/ui';

interface SidebarContextValue {
  navItems: NavItem[];
  setNavItems: (items: NavItem[]) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  return (
    <SidebarContext.Provider value={{ navItems, setNavItems }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarNavItems() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarNavItems must be used within SidebarProvider');
  }
  return context;
}
