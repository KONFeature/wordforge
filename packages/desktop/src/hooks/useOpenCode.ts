import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

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

  return {
    status,
    installedVersion,
    latestVersion,
    port,
    updateAvailable,
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
  start: () => Promise<void>;
  stop: () => Promise<void>;
  openView: () => Promise<void>;
  refresh: () => void;
}

export function useOpenCode(): UseOpenCodeReturn {
  const queryClient = useQueryClient();
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const stateQuery = useQuery({
    queryKey: openCodeKeys.status(),
    queryFn: fetchOpenCodeState,
    refetchInterval: 5000,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      setDownloadProgress({ message: 'Starting download...', percent: 0 });
      setMutationError(null);
      await invoke('download_opencode');
    },
    onSuccess: () => {
      setDownloadProgress(null);
      queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
    },
    onError: (error) => {
      setDownloadProgress(null);
      setMutationError(error instanceof Error ? error.message : String(error));
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      setMutationError(null);
      const port = await invoke<number>('start_opencode');
      return port;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
    },
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : String(error));
      queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      setMutationError(null);
      await invoke('stop_opencode');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
    },
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : String(error));
      queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
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

  const state = stateQuery.data;
  const isStarting = startMutation.isPending;
  const computedStatus: OpenCodeStatus = isStarting
    ? 'starting'
    : (state?.status ?? 'not_installed');

  return {
    status: computedStatus,
    installedVersion: state?.installedVersion ?? null,
    latestVersion: state?.latestVersion ?? null,
    updateAvailable: state?.updateAvailable ?? false,
    port: state?.port ?? null,
    isDownloading: downloadMutation.isPending,
    downloadProgress,
    error: mutationError,
    download: async () => {
      await downloadMutation.mutateAsync();
    },
    start: async () => {
      await startMutation.mutateAsync();
    },
    stop: async () => {
      await stopMutation.mutateAsync();
    },
    openView: async () => {
      await openViewMutation.mutateAsync();
    },
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: openCodeKeys.all });
    },
  };
}
