import type { Provider } from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filterProviders } from '../../lib/filterModels';
import type { AgentInfo } from '../../types';

interface AgentsResponse {
  agents: AgentInfo[];
}

interface OpenCodeProvidersResponse {
  providers: Provider[];
}

const AGENTS_KEY = ['agents'] as const;
const OPENCODE_PROVIDERS_KEY = ['opencode-providers'] as const;

export const useAgents = (restUrl: string, nonce: string) => {
  return useQuery({
    queryKey: AGENTS_KEY,
    queryFn: async (): Promise<AgentsResponse> => {
      const response = await fetch(`${restUrl}/opencode/agents`, {
        headers: {
          'X-WP-Nonce': nonce,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      return response.json();
    },
  });
};

export const useOpenCodeProviders = (restUrl: string, nonce: string) => {
  return useQuery({
    queryKey: OPENCODE_PROVIDERS_KEY,
    queryFn: async (): Promise<Provider[]> => {
      const response = await fetch(
        `${restUrl}/opencode/proxy/config/providers`,
        {
          headers: {
            'X-WP-Nonce': nonce,
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        return [];
      }

      const data: OpenCodeProvidersResponse = await response.json();
      const providers = Array.isArray(data?.providers) ? data.providers : [];
      return filterProviders(providers);
    },
    staleTime: 30000,
  });
};

export const useSaveAgents = (restUrl: string, nonce: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (models: Record<string, string>) => {
      const response = await fetch(`${restUrl}/opencode/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce,
        },
        credentials: 'include',
        body: JSON.stringify({ models }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save agent models');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        AGENTS_KEY,
        (old: AgentsResponse | undefined) => ({
          ...old,
          agents: data.agents,
        }),
      );
    },
  });
};

export const useResetAgents = (restUrl: string, nonce: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${restUrl}/opencode/agents/reset`, {
        method: 'POST',
        headers: {
          'X-WP-Nonce': nonce,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset agent models');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        AGENTS_KEY,
        (old: AgentsResponse | undefined) => ({
          ...old,
          agents: data.agents,
        }),
      );
    },
  });
};
