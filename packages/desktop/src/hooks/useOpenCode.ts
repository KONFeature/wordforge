import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';

type Status =
  | 'not_installed'
  | 'stopped'
  | 'starting'
  | 'running'
  | { error: string };

interface DownloadProgress {
  message: string;
  percent: number;
}

export interface UseOpenCodeReturn {
  status: Status;
  installedVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  port: number | null;
  isDownloading: boolean;
  downloadProgress: DownloadProgress | null;
  error: string | null;
  download: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  openView: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOpenCode(): UseOpenCodeReturn {
  const [status, setStatus] = useState<Status>('not_installed');
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [port, setPort] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [currentStatus, installed, latest, currentPort, hasUpdate] =
        await Promise.all([
          invoke<Status>('get_status'),
          invoke<string | null>('get_installed_version'),
          invoke<string>('get_latest_version').catch(() => null),
          invoke<number | null>('get_opencode_port'),
          invoke<boolean>('check_update_available').catch(() => false),
        ]);

      setStatus(currentStatus);
      setInstalledVersion(installed);
      setLatestVersion(latest);
      setPort(currentPort);
      setUpdateAvailable(hasUpdate);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const unlistenProgress = listen<DownloadProgress>(
      'opencode:download-progress',
      (event) => {
        setDownloadProgress(event.payload);
      },
    );

    const unlistenLog = listen<string>('opencode:log', (event) => {
      console.log('[OpenCode]', event.payload);
    });

    const unlistenError = listen<string>('opencode:error', (event) => {
      console.error('[OpenCode]', event.payload);
    });

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenLog.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  const download = useCallback(async () => {
    setIsDownloading(true);
    setDownloadProgress({ message: 'Starting download...', percent: 0 });
    setError(null);

    try {
      await invoke('download_opencode');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [refresh]);

  const start = useCallback(async () => {
    setError(null);
    setStatus('starting');

    try {
      const newPort = await invoke<number>('start_opencode');
      setPort(newPort);
      setStatus('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      await refresh();
    }
  }, [refresh]);

  const stop = useCallback(async () => {
    setError(null);

    try {
      await invoke('stop_opencode');
      setPort(null);
      setStatus('stopped');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      await refresh();
    }
  }, [refresh]);

  const openView = useCallback(async () => {
    setError(null);

    try {
      await invoke('open_opencode_view');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return {
    status,
    installedVersion,
    latestVersion,
    updateAvailable,
    port,
    isDownloading,
    downloadProgress,
    error,
    download,
    start,
    stop,
    openView,
    refresh,
  };
}
