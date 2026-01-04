import styles from './AppStatusBar.module.css';
import { StatusIndicator, type StatusIndicatorStatus } from './StatusIndicator';

export interface AppStatusBarProps {
  openCodeStatus:
    | 'not_installed'
    | 'stopped'
    | 'starting'
    | 'running'
    | { error: string };
  openCodePort?: number | null;
  openCodeVersion?: string | null;
  siteConnected?: boolean;
}

export function AppStatusBar({
  openCodeStatus,
  openCodePort,
  openCodeVersion,
  siteConnected,
}: AppStatusBarProps) {
  const getOpenCodeIndicatorStatus = (): StatusIndicatorStatus => {
    if (openCodeStatus === 'running') return 'success';
    if (openCodeStatus === 'starting') return 'loading';
    if (typeof openCodeStatus === 'object' && 'error' in openCodeStatus)
      return 'error';
    return 'idle';
  };

  const getOpenCodeLabel = (): string => {
    if (openCodeStatus === 'running') {
      return openCodePort
        ? `OpenCode running on port ${openCodePort}`
        : 'OpenCode running';
    }
    if (openCodeStatus === 'starting') return 'OpenCode starting...';
    if (openCodeStatus === 'stopped') return 'OpenCode stopped';
    if (openCodeStatus === 'not_installed') return 'OpenCode not installed';
    if (typeof openCodeStatus === 'object' && 'error' in openCodeStatus)
      return 'OpenCode error';
    return 'OpenCode';
  };

  return (
    <div className={styles.statusBar}>
      <StatusIndicator
        status={siteConnected ? 'success' : 'idle'}
        label={siteConnected ? 'Site connected' : 'No site'}
      />

      <span className={styles.divider} />

      <StatusIndicator
        status={getOpenCodeIndicatorStatus()}
        label={getOpenCodeLabel()}
        showPulse={openCodeStatus === 'starting'}
      />

      <span className={styles.spacer} />

      {openCodeVersion && (
        <span className={styles.version}>v{openCodeVersion}</span>
      )}
    </div>
  );
}
