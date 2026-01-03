import { __ } from '@wordpress/i18n';
import { useClient } from '../../lib/ClientProvider';
import type { ConnectionMode } from '../../lib/openCodeClient';
import styles from './StatusIndicator.module.css';

const getLabel = (mode: ConnectionMode): string => {
  switch (mode) {
    case 'local':
      return __('Local', 'wordforge');
    case 'remote':
      return __('Server', 'wordforge');
    default:
      return __('Offline', 'wordforge');
  }
};

const getModeClass = (mode: ConnectionMode): string => {
  switch (mode) {
    case 'local':
      return styles.local;
    case 'remote':
      return styles.remote;
    default:
      return styles.disconnected;
  }
};

export const StatusIndicator = () => {
  const { connectionStatus } = useClient();
  const { mode } = connectionStatus;

  return (
    <span className={`${styles.indicator} ${getModeClass(mode)}`}>
      <span className={styles.dot} />
      <span className={styles.label}>{getLabel(mode)}</span>
    </span>
  );
};
