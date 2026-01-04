import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';
import type { ConfigSyncStatus } from '../types';

const CONFIG_CHECK_INTERVAL = 5 * 60 * 1000;

const configSyncKeys = {
  all: ['configSync'] as const,
  status: (siteId?: string) =>
    [...configSyncKeys.all, 'status', siteId] as const,
};

async function checkConfigUpdate(siteId?: string): Promise<ConfigSyncStatus> {
  return invoke<ConfigSyncStatus>('check_config_update', { siteId });
}

async function refreshConfig(
  siteId?: string,
  restartOpencode = true,
): Promise<string> {
  return invoke<string>('refresh_site_config', {
    siteId,
    restartOpencode,
  });
}

export interface UseConfigSyncOptions {
  siteId?: string;
  enabled?: boolean;
  pollingInterval?: number;
}

export interface UseConfigSyncReturn {
  status: ConfigSyncStatus | null;
  isChecking: boolean;
  isUpdating: boolean;
  updateAvailable: boolean;
  error: string | null;
  checkNow: () => Promise<void>;
  applyUpdate: (restartOpencode?: boolean) => Promise<string>;
  lastChecked: Date | null;
}

export function useConfigSync(
  options: UseConfigSyncOptions = {},
): UseConfigSyncReturn {
  const {
    siteId,
    enabled = true,
    pollingInterval = CONFIG_CHECK_INTERVAL,
  } = options;

  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: configSyncKeys.status(siteId),
    queryFn: () => checkConfigUpdate(siteId),
    enabled,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval - 10000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const refreshMutation = useMutation({
    mutationFn: async ({
      restartOpencode = true,
    }: { restartOpencode?: boolean } = {}) => {
      setMutationError(null);
      return refreshConfig(siteId, restartOpencode);
    },
    onSuccess: (_data, _var, _res, { client: queryClient }) => {
      queryClient.invalidateQueries({ queryKey: configSyncKeys.all });
    },
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : String(error));
    },
  });

  useEffect(() => {
    const unlistenPromise = listen<string>('config:updated', () => {
      queryClient.invalidateQueries({ queryKey: configSyncKeys.all });
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [queryClient]);

  const applyUpdate = useCallback(
    async (restartOpencode = true) => {
      return refreshMutation.mutateAsync({ restartOpencode });
    },
    [refreshMutation],
  );

  const status = statusQuery.data ?? null;
  const lastChecked = status?.last_checked
    ? new Date(status.last_checked * 1000)
    : null;

  return {
    status,
    isChecking: statusQuery.isFetching,
    isUpdating: refreshMutation.isPending,
    updateAvailable: status?.update_available ?? false,
    error: statusQuery.error?.message ?? mutationError,
    checkNow: async () => {
      await statusQuery.refetch();
    },
    applyUpdate,
    lastChecked,
  };
}
