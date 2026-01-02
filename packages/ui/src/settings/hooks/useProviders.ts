import type { ProviderListResponses } from '@opencode-ai/sdk/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { hasProviderFreeModels } from '../../lib/filterModels';
import { opencodeClient } from '../../lib/openCodeClient';
import { getProviderMeta, sortProviders } from '../../lib/providerHelpers';
import type { ConfiguredProvider, ProviderDisplayInfo } from '../../types';

interface ConfiguredProvidersResponse {
  configuredProviders: Record<string, ConfiguredProvider>;
}

const CONFIGURED_PROVIDERS_KEY = ['configured-providers'] as const;
const OPENCODE_PROVIDERS_KEY = ['opencode-providers'] as const;
export const MERGED_PROVIDERS_KEY = ['merged-providers'] as const;

const mergeProviders = (
  openCodeProviders: ProviderListResponses['200']['all'],
  configuredProviders: Record<string, ConfiguredProvider>,
): ProviderDisplayInfo[] => {
  const merged: ProviderDisplayInfo[] = openCodeProviders.map((provider) => {
    const meta = getProviderMeta(provider.id);
    const configured = configuredProviders[provider.id];

    return {
      id: provider.id,
      name: provider.name,
      configured: configured?.configured ?? false,
      apiKeyMasked: configured?.api_key_masked ?? null,
      helpUrl: meta.helpUrl,
      helpText: meta.helpText,
      placeholder: meta.placeholder ?? '',
      hasFreeModels: hasProviderFreeModels(provider),
    };
  });

  return sortProviders(merged);
};

export const useProviders = (restUrl: string, nonce: string) => {
  const configuredQuery = useQuery({
    queryKey: CONFIGURED_PROVIDERS_KEY,
    queryFn: async () => {
      const response = await fetch(`${restUrl}/opencode/providers`, {
        headers: { 'X-WP-Nonce': nonce },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configured providers');
      }

      const data: ConfiguredProvidersResponse = await response.json();
      return data.configuredProviders ?? {};
    },
    staleTime: 60000,
  });

  const openCodeQuery = useQuery({
    queryKey: OPENCODE_PROVIDERS_KEY,
    queryFn: async () => {
      const response = await opencodeClient.provider.list();
      return response.data?.all ?? [];
    },
    staleTime: 300000,
  });

  const providers =
    openCodeQuery.data && configuredQuery.data
      ? mergeProviders(openCodeQuery.data, configuredQuery.data)
      : [];

  return {
    data: { providers },
    isLoading: configuredQuery.isLoading || openCodeQuery.isLoading,
    error: configuredQuery.error || openCodeQuery.error,
  };
};

export const useSaveProvider = (restUrl: string, nonce: string) => {
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
    onSuccess: (data, _var, _err, { client: queryClient }) => {
      queryClient.setQueryData(
        CONFIGURED_PROVIDERS_KEY,
        data.configuredProviders ?? {},
      );
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

export const useRemoveProvider = (restUrl: string, nonce: string) => {
  return useMutation({
    mutationFn: async (providerId: string) => {
      const response = await fetch(
        `${restUrl}/opencode/providers/${providerId}`,
        {
          method: 'DELETE',
          headers: { 'X-WP-Nonce': nonce },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove provider');
      }

      return response.json();
    },
    onSuccess: (data, _var, _err, { client: queryClient }) => {
      queryClient.setQueryData(
        CONFIGURED_PROVIDERS_KEY,
        data.configuredProviders ?? {},
      );
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};
