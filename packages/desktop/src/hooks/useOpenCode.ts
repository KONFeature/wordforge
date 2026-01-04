import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';

export type OpenCodeStatus =
  | 'not_installed'
  | 'stopped'
  | 'starting'
  | 'running'
  | { error: string };

interface DownloadProgress {
  message: string;
  percent: number;
}

interface OpenCodeState {
  status: OpenCodeStatus;
  installedVersion: string | null;
  latestVersion: string | null;
  port: number | null;
  updateAvailable: boolean;
}

const openCodeKeys = {
  all: ['opencode'] as const,
  status: () => [...openCodeKeys.all, 'status'] as const,
};

async function fetchOpenCodeState(): Promise<OpenCodeState> {
  const [status, installedVersion, latestVersion, port, updateAvailable] =
    await Promise.all([
      invoke<OpenCodeStatus>('get_status').catch(
        () => 'stopped' as OpenCodeStatus,
      ),
      invoke<string | null>('get_installed_version').catch(() => null),
      invoke<string>('get_latest_version').catch(() => null),
      invoke<number | null>('get_opencode_port').catch(() => null),
      invoke<boolean>('check_update_available').catch(() => false),
    ]);

  return { status, installedVersion, latestVersion, port, updateAvailable };
}

export function useOpenCodeStatus() {
  const stateQuery = useQuery({
    queryKey: openCodeKeys.status(),
    queryFn: fetchOpenCodeState,
    refetchInterval: 5000,
  });

  return {
    status: stateQuery.data?.status ?? 'not_installed',
    installedVersion: stateQuery.data?.installedVersion ?? null,
    latestVersion: stateQuery.data?.latestVersion ?? null,
    updateAvailable: stateQuery.data?.updateAvailable ?? false,
    port: stateQuery.data?.port ?? null,
    isLoading: stateQuery.isLoading,
  };
}

export function useOpenCodeActions() {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
  }, [queryClient]);

  const startMutation = useMutation({
    mutationFn: async () => {
      setMutationError(null);
      return invoke<number>('start_opencode');
    },
    onSuccess: invalidate,
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : String(error));
      invalidate();
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      setMutationError(null);
      await invoke('stop_opencode');
    },
    onSuccess: invalidate,
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : String(error));
      invalidate();
    },
  });

  const openViewMutation = useMutation({
    mutationFn: async () => {
      await invoke('open_opencode_view');
    },
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : String(error));
    },
  });

  return {
    start: startMutation.mutateAsync,
    isStarting: startMutation.isPending,

    stop: stopMutation.mutateAsync,
    isStopping: stopMutation.isPending,

    openView: openViewMutation.mutateAsync,

    error: mutationError,
    clearError: () => setMutationError(null),

    refresh: invalidate,
  };
}

export function useOpenCodeDownload() {
  const queryClient = useQueryClient();
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadMutation = useMutation({
    mutationFn: async () => {
      setDownloadProgress({ message: 'Starting download...', percent: 0 });
      setError(null);
      await invoke('download_opencode');
    },
    onSuccess: () => {
      setDownloadProgress(null);
      queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
    },
    onError: (err) => {
      setDownloadProgress(null);
      setError(err instanceof Error ? err.message : String(err));
    },
  });

  useEffect(() => {
    const unlistenPromise = listen<DownloadProgress>(
      'opencode:download-progress',
      (event) => {
        setDownloadProgress(event.payload);
      },
    );

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  return {
    download: downloadMutation.mutateAsync,
    isDownloading: downloadMutation.isPending,
    downloadProgress,
    error,
  };
}

export interface UseOpenCodeReturn {
  status: OpenCodeStatus;
  installedVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  port: number | null;
  isDownloading: boolean;
  downloadProgress: DownloadProgress | null;
  error: string | null;
  download: () => Promise<void>;
  start: () => Promise<number>;
  stop: () => Promise<void>;
  openView: () => Promise<void>;
  refresh: () => void;
}

export function useOpenCode(): UseOpenCodeReturn {
  const statusHook = useOpenCodeStatus();
  const actionsHook = useOpenCodeActions();
  const downloadHook = useOpenCodeDownload();

  const computedStatus: OpenCodeStatus = actionsHook.isStarting
    ? 'starting'
    : statusHook.status;

  return {
    status: computedStatus,
    installedVersion: statusHook.installedVersion,
    latestVersion: statusHook.latestVersion,
    updateAvailable: statusHook.updateAvailable,
    port: statusHook.port,
    isDownloading: downloadHook.isDownloading,
    downloadProgress: downloadHook.downloadProgress,
    error: actionsHook.error ?? downloadHook.error,
    download: downloadHook.download,
    start: actionsHook.start,
    stop: actionsHook.stop,
    openView: actionsHook.openView,
    refresh: actionsHook.refresh,
  };
}
