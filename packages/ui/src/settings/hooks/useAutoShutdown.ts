import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import type { ActivityStatus } from '../../types';

export const AUTO_SHUTDOWN_KEY = ['auto-shutdown'] as const;

interface AutoShutdownSettings {
  enabled: boolean;
  threshold: number;
  activity: ActivityStatus;
}

export const useAutoShutdownSettings = () => {
  return useQuery({
    queryKey: AUTO_SHUTDOWN_KEY,
    queryFn: async (): Promise<AutoShutdownSettings> => {
      return await apiFetch<AutoShutdownSettings>({
        path: '/wordforge/v1/opencode/auto-shutdown',
      });
    },
  });
};

interface SaveAutoShutdownParams {
  enabled?: boolean;
  threshold?: number;
}

export const useSaveAutoShutdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveAutoShutdownParams) => {
      return await apiFetch<AutoShutdownSettings>({
        path: '/wordforge/v1/opencode/auto-shutdown',
        method: 'POST',
        data: params,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTO_SHUTDOWN_KEY });
    },
  });
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

export const THRESHOLD_OPTIONS = [
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 7200, label: '2 hours' },
  { value: 14400, label: '4 hours' },
  { value: 28800, label: '8 hours' },
  { value: 86400, label: '24 hours' },
];
