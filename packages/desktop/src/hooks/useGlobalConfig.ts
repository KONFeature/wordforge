import type { Config, ProviderConfig } from '@opencode-ai/sdk/v2/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useRestartRequired } from '../context/RestartContext';
import { AVAILABLE_PLUGINS } from '../lib/plugins';
import type { OpenCodePlugin } from '../types';
import { useOpenCodeStatus } from './useOpenCode';

const GLOBAL_CONFIG_KEY = ['globalConfig'] as const;

export function useGlobalConfig() {
  return useQuery({
    queryKey: GLOBAL_CONFIG_KEY,
    queryFn: async (): Promise<Config> => {
      return invoke<Config>('get_global_config');
    },
  });
}

export function useSetGlobalConfig() {
  return useMutation({
    mutationFn: async (config: Config) => {
      await invoke('set_global_config', { config });
    },
    onSuccess: (_data, _var, _res, { client: queryClient }) => {
      queryClient.invalidateQueries({ queryKey: GLOBAL_CONFIG_KEY });
    },
  });
}

function buildConfigFromPlugins(
  baseConfig: Config,
  enabledPlugins: OpenCodePlugin[],
): Config {
  const config: Config = { ...baseConfig };
  config.plugin = enabledPlugins.map((p) => p.packageName);

  const mergedProviders: Record<string, ProviderConfig> = {};

  for (const plugin of enabledPlugins) {
    if (plugin.providerConfig) {
      for (const [providerKey, providerConfig] of Object.entries(
        plugin.providerConfig,
      )) {
        if (!mergedProviders[providerKey]) {
          mergedProviders[providerKey] = { models: {} };
        }
        if (providerConfig.models) {
          mergedProviders[providerKey].models = {
            ...mergedProviders[providerKey].models,
            ...providerConfig.models,
          };
        }
      }
    }
  }

  if (Object.keys(mergedProviders).length > 0) {
    config.provider = mergedProviders;
  } else {
    config.provider = undefined;
  }
  return config;
}

export function usePluginToggle() {
  const { data: config } = useGlobalConfig();
  const { mutateAsync: setConfig, isPending } = useSetGlobalConfig();
  const { status } = useOpenCodeStatus();
  const { setRestartRequired } = useRestartRequired();

  const currentPluginNames = config?.plugin ?? [];
  const isRunning = status === 'running';

  const isPluginEnabled = (packageName: string): boolean => {
    const baseName = packageName.split('@')[0];
    return currentPluginNames.some((p) => p.startsWith(baseName));
  };

  const togglePlugin = async (
    plugin: OpenCodePlugin,
    enabled: boolean,
  ): Promise<void> => {
    const baseName = plugin.packageName.split('@')[0];

    const currentPlugins = AVAILABLE_PLUGINS.filter((p) =>
      isPluginEnabled(p.packageName),
    );

    const newPlugins = enabled
      ? [
          ...currentPlugins.filter((p) => !p.packageName.startsWith(baseName)),
          plugin,
        ]
      : currentPlugins.filter((p) => !p.packageName.startsWith(baseName));

    const newConfig = buildConfigFromPlugins(config ?? {}, newPlugins);
    await setConfig(newConfig);

    if (isRunning) {
      setRestartRequired(true, 'Plugin configuration changed');
    }
  };

  return {
    enabledPlugins: currentPluginNames,
    isPluginEnabled,
    togglePlugin,
    isPending,
  };
}
