import type { ProviderAuthAuthorization } from '@opencode-ai/sdk/v2/client';
import { createOpencodeClient } from '@opencode-ai/sdk/v2/client';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useCallback, useRef, useState } from 'react';
import { useRestartRequired } from '../context/RestartContext';
import {
  type OAuthProvider,
  findOAuthMethodIndex,
} from '../lib/oauth-providers';
import { useGlobalConfig, useSetGlobalConfig } from './useGlobalConfig';
import { useOpenCode } from './useOpenCode';

export type OAuthLoginState =
  | { status: 'idle' }
  | { status: 'enabling-plugin' }
  | { status: 'restarting' }
  | { status: 'waiting-for-server' }
  | { status: 'fetching-auth-methods' }
  | { status: 'authorizing' }
  | { status: 'waiting-for-callback'; authorization: ProviderAuthAuthorization }
  | { status: 'success' }
  | { status: 'error'; message: string };

interface UseOAuthLoginReturn {
  state: OAuthLoginState;
  startLogin: (provider: OAuthProvider) => Promise<void>;
  submitCode: (code: string) => Promise<void>;
  reset: () => void;
  currentProvider: OAuthProvider | null;
  isSubmittingCode: boolean;
}

type OpenCodeClient = ReturnType<typeof createOpencodeClient>;

export function useOAuthLogin(): UseOAuthLoginReturn {
  const [state, setState] = useState<OAuthLoginState>({ status: 'idle' });
  const [currentProvider, setCurrentProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [pendingAuth, setPendingAuth] = useState<{
    providerID: string;
    methodIndex: number;
  } | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const queryClient = useQueryClient();
  const { data: config } = useGlobalConfig();
  const { mutateAsync: setConfig } = useSetGlobalConfig();
  const { status: serverStatus, start, stop } = useOpenCode();
  const { clearRestartRequired } = useRestartRequired();
  const clientRef = useRef<OpenCodeClient | null>(null);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
    setCurrentProvider(null);
    setPendingAuth(null);
    setIsSubmittingCode(false);
    clientRef.current = null;
  }, []);

  const getOrCreateClient = useCallback(async (): Promise<OpenCodeClient> => {
    if (clientRef.current) {
      return clientRef.current;
    }

    const port = await invoke<number | null>('get_opencode_port');
    if (!port) {
      throw new Error('OpenCode server port not available');
    }

    clientRef.current = createOpencodeClient({
      baseUrl: `http://localhost:${port}`,
    });

    return clientRef.current;
  }, []);

  const waitForServer = useCallback(
    async (maxWaitMs = 30_000): Promise<boolean> => {
      const startTime = Date.now();
      const pollInterval = 500;

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        const currentStatus = queryClient.getQueryData<{ status: string }>([
          'opencode',
          'status',
        ]);
        if (currentStatus?.status === 'running') {
          return true;
        }
      }
      return false;
    },
    [queryClient],
  );

  const startLogin = useCallback(
    async (provider: OAuthProvider) => {
      setCurrentProvider(provider);
      clientRef.current = null;

      try {
        const currentPlugins = config?.plugin ?? [];
        const pluginRequired = provider.plugin;
        let needsRestart = false;

        // Enable the plugin if this provider rely on a plugin
        if (pluginRequired) {
          const baseName = pluginRequired.packageName.split('@')[0];
          const isPluginEnabled = currentPlugins.some((p) =>
            p.startsWith(baseName),
          );

          if (!isPluginEnabled) {
            setState({ status: 'enabling-plugin' });

            const newPlugins = [...currentPlugins, pluginRequired.packageName];
            const newConfig = {
              ...config,
              plugin: newPlugins,
              provider: {
                ...config?.provider,
                ...pluginRequired.providerConfig,
              },
            };

            await setConfig(newConfig);

            needsRestart = true;
          }
        }

        if (needsRestart) {
          setState({ status: 'restarting' });
          await stop();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (serverStatus !== 'running') {
          setState({ status: 'waiting-for-server' });
          await start();
          await waitForServer();
          clearRestartRequired();
          await queryClient.invalidateQueries({ queryKey: ['opencode'] });
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        setState({ status: 'fetching-auth-methods' });

        const client = await getOrCreateClient();

        const authResponse = await client.provider.auth();
        if (authResponse.error) {
          throw new Error('Failed to fetch auth methods');
        }

        const authMethods = authResponse.data?.[provider.providerID];
        console.log('Auth methods', authMethods);
        if (!authMethods || authMethods.length === 0) {
          throw new Error(
            `No auth methods available for ${provider.name}. Make sure the required plugin is enabled.`,
          );
        }

        const methodIndex = findOAuthMethodIndex(
          authMethods,
          provider.oauthLabel,
        );
        console.log('Method index', methodIndex);
        if (methodIndex < 0) {
          throw new Error(`No OAuth method found for ${provider.name}`);
        }

        setState({ status: 'authorizing' });
        setPendingAuth({ providerID: provider.providerID, methodIndex });

        const authorizeResponse = await client.provider.oauth.authorize({
          providerID: provider.providerID,
          method: methodIndex,
        });
        console.log('Authorize response', authorizeResponse);

        if (authorizeResponse.error) {
          throw new Error('Failed to initiate OAuth authorization');
        }

        const authorization = authorizeResponse.data;
        if (!authorization) {
          throw new Error('No authorization data received');
        }

        setState({ status: 'waiting-for-callback', authorization });

        await openUrl(authorization.url);

        if (authorization.method === 'auto') {
          const callbackResponse = await client.provider.oauth.callback({
            providerID: provider.providerID,
            method: methodIndex,
          });

          if (callbackResponse.error) {
            throw new Error('OAuth callback failed');
          }

          await client.global.dispose();
          await queryClient.invalidateQueries();
          setState({ status: 'success' });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'error', message });
      }
    },
    [
      config,
      setConfig,
      serverStatus,
      start,
      stop,
      waitForServer,
      clearRestartRequired,
      queryClient,
      getOrCreateClient,
    ],
  );

  const submitCode = useCallback(
    async (code: string) => {
      if (!pendingAuth) {
        setState({ status: 'error', message: 'No pending authorization' });
        return;
      }

      try {
        setIsSubmittingCode(true);

        const client = await getOrCreateClient();

        const callbackResponse = await client.provider.oauth.callback({
          providerID: pendingAuth.providerID,
          method: pendingAuth.methodIndex,
          code,
        });

        if (callbackResponse.error) {
          throw new Error('Invalid authorization code');
        }

        await client.global.dispose();
        await queryClient.invalidateQueries();
        setState({ status: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'error', message });
      } finally {
        setIsSubmittingCode(false);
      }
    },
    [pendingAuth, queryClient, getOrCreateClient],
  );

  return {
    state,
    startLogin,
    submitCode,
    reset,
    currentProvider,
    isSubmittingCode,
  };
}
