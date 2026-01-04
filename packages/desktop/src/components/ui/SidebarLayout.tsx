import type { ReactNode } from 'react';
import styles from './SidebarLayout.module.css';

export interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  statusBar?: ReactNode;
}

export function SidebarLayout({
  sidebar,
  children,
  statusBar,
}: SidebarLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>{sidebar}</aside>
        <main className={styles.content}>{children}</main>
      </div>
      {statusBar && <footer className={styles.statusBar}>{statusBar}</footer>}
    </div>
  );
}
