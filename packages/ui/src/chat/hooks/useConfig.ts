import type { SelectedModel } from '@/components/ModelSelector';
import type { Agent, McpStatus, Provider } from '@opencode-ai/sdk/v2';
import { useQuery } from '@tanstack/react-query';
import {
  useConnectionStatus,
  useOpencodeClientOptional,
} from '../../lib/ClientProvider';
import { filterProviders } from '../../lib/filterModels';
import { queryKeys } from '../../lib/queryKeys';

interface ConfigData {
  providers: Provider[];
  defaultModel: SelectedModel | null;
}

export const useProvidersConfig = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useQuery({
    queryKey: queryKeys.config(mode),
    queryFn: async (): Promise<ConfigData> => {
      const result = await client!.config.providers();
      const data = result.data;
      const rawProviders =
        data && Array.isArray(data.providers) ? data.providers : [];
      const providers = filterProviders(rawProviders);
      const defaultModels = data?.default ?? {};

      let defaultModel: SelectedModel | null = null;
      const defaultModelKey = Object.keys(defaultModels)[0];
      if (defaultModelKey && defaultModels[defaultModelKey]) {
        const [providerID, modelID] = defaultModels[defaultModelKey].split('/');
        if (providerID && modelID) {
          defaultModel = { providerID, modelID };
        }
      } else if (providers.length > 0) {
        const firstProvider = providers[0];
        const firstModelId = Object.keys(firstProvider.models || {})[0];
        if (firstModelId) {
          defaultModel = {
            providerID: firstProvider.id,
            modelID: firstModelId,
          };
        }
      }

      return { providers, defaultModel };
    },
    enabled: !!client,
  });
};

export const useMcpStatus = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useQuery({
    queryKey: queryKeys.mcpStatus(mode),
    queryFn: async () => {
      const result = await client!.mcp.status();
      return (
        result.data && typeof result.data === 'object' ? result.data : {}
      ) as Record<string, McpStatus>;
    },
    enabled: !!client,
  });
};

export const useAgentsConfig = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useQuery({
    queryKey: queryKeys.agentConfigs(mode),
    queryFn: async (): Promise<Agent[]> => {
      const result = await client!.app.agents();
      return result.data ?? [];
    },
    enabled: !!client,
    staleTime: 300000,
  });
};
