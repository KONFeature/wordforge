import type { McpStatus, Provider } from '@opencode-ai/sdk/client';
import { useQuery } from '@tanstack/react-query';
import { useOpencodeClientOptional } from '../../lib/ClientProvider';
import { filterProviders } from '../../lib/filterModels';
import type { SelectedModel } from '../components/ModelSelector';

export const CONFIG_KEY = ['config'] as const;
export const MCP_STATUS_KEY = ['mcp-status'] as const;

interface ConfigData {
  providers: Provider[];
  defaultModel: SelectedModel | null;
}

export const useProvidersConfig = () => {
  const client = useOpencodeClientOptional();

  return useQuery({
    queryKey: CONFIG_KEY,
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

  return useQuery({
    queryKey: MCP_STATUS_KEY,
    queryFn: async () => {
      const result = await client!.mcp.status();
      return (
        result.data && typeof result.data === 'object' ? result.data : {}
      ) as Record<string, McpStatus>;
    },
    enabled: !!client,
  });
};
