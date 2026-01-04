import { Download, ExternalLink, Play, Square } from 'lucide-react';
import { useOpenCodeClientSafe } from '../context/OpenCodeClientContext';
import {
  useOpenCodeActions,
  useOpenCodeDownload,
  useOpenCodeStatus,
} from '../hooks/useOpenCode';
import styles from './ServerControls.module.css';
import { Button, Progress, StatusIndicator } from './ui';

export function ServerControls() {
  const { status, port } = useOpenCodeStatus();
  const { start, stop, isStarting } = useOpenCodeActions();
  const { download, isDownloading, downloadProgress } = useOpenCodeDownload();
  const clientContext = useOpenCodeClientSafe();

  const isInstalled = status !== 'not_installed';
  const isRunning = status === 'running';
  const isStartingStatus = status === 'starting' || isStarting;

  const handleOpenCode = () => {
    clientContext?.openInWebview();
  };

  if (isDownloading) {
    return (
      <div className={styles.container}>
        <Progress
          value={downloadProgress?.percent || 0}
          label={downloadProgress?.message || 'Downloading OpenCode...'}
          showValue
        />
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className={styles.container}>
        <Button
          variant="primary"
          size="lg"
          onClick={() => download()}
          leftIcon={<Download size={18} />}
          className={styles.fullWidth}
        >
          Download OpenCode
        </Button>
      </div>
    );
  }

  const getStatusIndicator = () => {
    if (isRunning) return 'success';
    if (isStartingStatus) return 'loading';
    return 'idle';
  };

  const getStatusLabel = () => {
    if (isRunning) return `Running on port ${port}`;
    if (isStartingStatus) return 'Starting...';
    return 'Stopped';
  };

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <Button
          variant="success"
          onClick={() => start()}
          disabled={isRunning || isStartingStatus}
          isLoading={isStartingStatus}
          leftIcon={!isStartingStatus ? <Play size={18} /> : undefined}
        >
          {isStartingStatus ? 'Starting...' : 'Start'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => stop()}
          disabled={!isRunning}
          leftIcon={<Square size={16} />}
        >
          Stop
        </Button>
        {isRunning && clientContext && (
          <Button
            variant="primary"
            onClick={handleOpenCode}
            leftIcon={<ExternalLink size={16} />}
          >
            Open
          </Button>
        )}
      </div>
      <StatusIndicator
        status={getStatusIndicator()}
        label={getStatusLabel()}
        showPulse={isStartingStatus}
      />
    </div>
  );
}
