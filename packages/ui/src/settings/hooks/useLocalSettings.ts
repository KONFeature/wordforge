import { useMutation, useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

export const LOCAL_SETTINGS_KEY = ['local-settings'] as const;

interface LocalSettings {
  port: number;
  enabled: boolean;
}

interface SaveLocalSettingsParams {
  port?: number;
  enabled?: boolean;
}

export const useLocalSettings = () => {
  return useQuery({
    queryKey: LOCAL_SETTINGS_KEY,
    queryFn: async (): Promise<LocalSettings> => {
      return await apiFetch<LocalSettings>({
        path: '/wordforge/v1/opencode/local-settings',
      });
    },
    staleTime: 30000,
  });
};

export const useSaveLocalSettings = () => {
  return useMutation({
    mutationFn: async (
      params: SaveLocalSettingsParams,
    ): Promise<LocalSettings> => {
      return await apiFetch<LocalSettings>({
        path: '/wordforge/v1/opencode/local-settings',
        method: 'POST',
        data: params,
      });
    },
    onSuccess: (_data, _var, _result, { client: queryClient }) => {
      queryClient.invalidateQueries({ queryKey: LOCAL_SETTINGS_KEY });
    },
  });
};

export const useDownloadLocalConfig = () => {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await apiFetch<Response>({
        path: '/wordforge/v1/opencode/local-config',
        // @ts-ignore wordpress api fetch enforce parse, we need it to false for file fetching
        parse: false,
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename =
        contentDisposition?.match(/filename="(.+)"/)?.[1] ??
        'wordforge-config.zip';
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};
