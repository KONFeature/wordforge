import { useMutation, useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import type { ActivityStatus } from '../../types';

export const SERVER_STATUS_KEY = ['server-status'] as const;

export interface ServerStatus {
  running: boolean;
  binaryInstalled: boolean;
  version: string | null;
  activity: ActivityStatus | null;
}

interface StatusResponse {
  binary: {
    is_installed: boolean;
    version: string | null;
  };
  server: {
    running: boolean;
    port: number | null;
  };
  activity: ActivityStatus;
}

interface AutoStartResponse {
  success: boolean;
  url: string;
  port: number;
  version: string | null;
  status: string;
  binary: {
    is_installed: boolean;
    version: string | null;
  };
  activity: ActivityStatus;
}

export const useServerStatus = () => {
  return useQuery({
    queryKey: SERVER_STATUS_KEY,
    queryFn: async (): Promise<ServerStatus> => {
      const data = await apiFetch<StatusResponse>({
        path: '/wordforge/v1/opencode/status',
      });

      return {
        running: data.server?.running ?? false,
        binaryInstalled: data.binary?.is_installed ?? false,
        version: data.binary?.version ?? null,
        activity: data.activity ?? null,
      };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
};

export const useAutoStartServer = () => {
  return useMutation({
    mutationFn: async (): Promise<AutoStartResponse> => {
      return await apiFetch<AutoStartResponse>({
        path: '/wordforge/v1/opencode/auto-start',
        method: 'POST',
      });
    },
    onSuccess: (_data, _var, _result, { client: queryClient }) => {
      queryClient.invalidateQueries({ queryKey: SERVER_STATUS_KEY });
    },
  });
};
