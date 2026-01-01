import type { Provider } from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProviderMeta, sortProviders } from '../../lib/providerHelpers';
import type { ConfiguredProvider, ProviderDisplayInfo } from '../../types';

interface ConfiguredProvidersResponse {
  configuredProviders: Record<string, ConfiguredProvider>;
}

interface OpenCodeProvidersResponse {
  providers: Provider[];
}

const CONFIGURED_PROVIDERS_KEY = ['configured-providers'] as const;
const OPENCODE_PROVIDERS_KEY = ['opencode-providers'] as const;
export const MERGED_PROVIDERS_KEY = ['merged-providers'] as const;

const fetchConfiguredProviders = async (
  restUrl: string,
  nonce: string,
): Promise<Record<string, ConfiguredProvider>> => {
  const response = await fetch(`${restUrl}/opencode/providers`, {
    headers: { 'X-WP-Nonce': nonce },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch configured providers');
  }

  const data: ConfiguredProvidersResponse = await response.json();
  return data.configuredProviders ?? {};
};

const fetchOpenCodeProviders = async (
  restUrl: string,
  nonce: string,
): Promise<Provider[]> => {
  const response = await fetch(`${restUrl}/opencode/proxy/config/providers`, {
    headers: { 'X-WP-Nonce': nonce },
    credentials: 'include',
  });

  if (!response.ok) {
    return [];
  }

  const data: OpenCodeProvidersResponse = await response.json();
  return data.providers ?? [];
};

const mergeProviders = (
  openCodeProviders: Provider[],
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
    };
  });

  return sortProviders(merged);
};

export const useProviders = (restUrl: string, nonce: string) => {
  const configuredQuery = useQuery({
    queryKey: CONFIGURED_PROVIDERS_KEY,
    queryFn: () => fetchConfiguredProviders(restUrl, nonce),
    staleTime: 60000,
  });

  const openCodeQuery = useQuery({
    queryKey: OPENCODE_PROVIDERS_KEY,
    queryFn: () => fetchOpenCodeProviders(restUrl, nonce),
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
      queryClient.setQueryData(
        CONFIGURED_PROVIDERS_KEY,
        data.configuredProviders ?? {},
      );
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
    onSuccess: (data) => {
      queryClient.setQueryData(
        CONFIGURED_PROVIDERS_KEY,
        data.configuredProviders ?? {},
      );
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};
