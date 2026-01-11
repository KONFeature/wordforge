import { RefreshCw, X } from 'lucide-react';
import { useRestartRequired } from '../../context/RestartContext';
import { useDebugMode } from '../../hooks/useDebugMode';
import { useOpenCodeActions, useOpenCodeStatus } from '../../hooks/useOpenCode';
import { Button } from './Button';
import styles from './RestartBanner.module.css';

export function RestartBanner() {
  const { restartRequired, restartReason, clearRestartRequired } =
    useRestartRequired();
  const { status } = useOpenCodeStatus();
  const { stop, start, isStarting } = useOpenCodeActions();
  const [debugMode] = useDebugMode();

  const isRunning = status === 'running';

  if (!restartRequired || !isRunning) {
    return null;
  }

  const handleRestart = async () => {
    await stop();
    await start(debugMode);
    clearRestartRequired();
  };

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <RefreshCw size={16} className={styles.icon} />
        <span className={styles.message}>
          {restartReason || 'OpenCode restart required to apply changes'}
        </span>
      </div>
      <div className={styles.actions}>
        <Button
          size="sm"
          variant="primary"
          onClick={handleRestart}
          isLoading={isStarting}
          leftIcon={!isStarting ? <RefreshCw size={14} /> : undefined}
        >
          Restart Now
        </Button>
        <button
          type="button"
          className={styles.dismiss}
          onClick={clearRestartRequired}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
