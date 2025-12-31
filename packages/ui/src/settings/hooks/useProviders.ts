import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AvailableModels, ProviderInfo } from '../../types';

interface ProvidersResponse {
  providers: ProviderInfo[];
  availableModels: AvailableModels;
  zenModels: Record<string, string>;
}

const PROVIDERS_KEY = ['providers'] as const;

export const useProviders = (restUrl: string, nonce: string) => {
  return useQuery({
    queryKey: PROVIDERS_KEY,
    queryFn: async (): Promise<ProvidersResponse> => {
      const response = await fetch(`${restUrl}/opencode/providers`, {
        headers: {
          'X-WP-Nonce': nonce,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }

      return response.json();
    },
  });
};

export const useSaveProvider = (restUrl: string, nonce: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      apiKey,
    }: {
      providerId: string;
      apiKey: string;
    }) => {
      const response = await fetch(`${restUrl}/opencode/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce,
        },
        credentials: 'include',
        body: JSON.stringify({ providerId, apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save provider');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROVIDERS_KEY, {
        providers: data.providers,
        availableModels: data.availableModels,
      });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

export const useRemoveProvider = (restUrl: string, nonce: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: string) => {
      const response = await fetch(
        `${restUrl}/opencode/providers/${providerId}`,
        {
          method: 'DELETE',
          headers: {
            'X-WP-Nonce': nonce,
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove provider');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROVIDERS_KEY, {
        providers: data.providers,
        availableModels: data.availableModels,
      });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};
