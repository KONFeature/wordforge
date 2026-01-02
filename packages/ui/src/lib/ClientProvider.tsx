import type { OpencodeClient } from '@opencode-ai/sdk/client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from '@wordpress/element';
import type { ReactNode } from 'react';
import {
  type ConnectionMode,
  checkLocalServerHealth,
  createLocalClient,
  createProxyClient,
  getProxyConfig,
} from './openCodeClient';

export interface ConnectionStatus {
  mode: ConnectionMode;
  localAvailable: boolean;
  remoteAvailable: boolean;
  localPort: number;
  isChecking: boolean;
}

interface ClientContextValue {
  client: OpencodeClient | null;
  connectionStatus: ConnectionStatus;
  preferLocal: boolean;
  setPreference: (prefer: 'local' | 'remote') => void;
  refreshStatus: () => void;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const STORAGE_KEY = 'wordforge_prefer_local';

async function checkRemoteServer(
  restUrl: string,
  nonce: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${restUrl}/opencode/status`, {
      method: 'GET',
      headers: {
        'X-WP-Nonce': nonce,
      },
      credentials: 'include',
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data?.server?.running === true;
  } catch {
    return false;
  }
}

interface ClientProviderProps {
  children: ReactNode;
}

export const ClientProvider = ({ children }: ClientProviderProps) => {
  const config =
    window.wordforgeChat ?? window.wordforgeWidget ?? window.wordforgeEditor;
  const settingsConfig = window.wordforgeSettings;

  const restUrl = settingsConfig?.restUrl ?? '';
  const nonce = config?.nonce ?? settingsConfig?.nonce ?? '';
  const localPort =
    config?.localServerPort ??
    settingsConfig?.settings?.localServerPort ??
    4096;
  const localEnabled =
    config?.localServerEnabled ??
    settingsConfig?.settings?.localServerEnabled ??
    true;

  const [preferLocal, setPreferLocalState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    mode: 'disconnected',
    localAvailable: false,
    remoteAvailable: false,
    localPort,
    isChecking: true,
  });

  const checkConnections = useCallback(async () => {
    setConnectionStatus((prev) => ({ ...prev, isChecking: true }));

    const [localAvailable, remoteAvailable] = await Promise.all([
      localEnabled ? checkLocalServerHealth(localPort) : Promise.resolve(false),
      restUrl ? checkRemoteServer(restUrl, nonce) : Promise.resolve(false),
    ]);

    let mode: ConnectionMode = 'disconnected';

    if (preferLocal && localAvailable) {
      mode = 'local';
    } else if (remoteAvailable) {
      mode = 'remote';
    } else if (localAvailable) {
      mode = 'local';
    }

    setConnectionStatus({
      mode,
      localAvailable,
      remoteAvailable,
      localPort,
      isChecking: false,
    });
  }, [localEnabled, localPort, restUrl, nonce, preferLocal]);

  useEffect(() => {
    checkConnections();

    const pollInterval =
      connectionStatus.mode === 'disconnected' ? 5000 : 30000;
    const interval = setInterval(checkConnections, pollInterval);
    return () => clearInterval(interval);
  }, [checkConnections, connectionStatus.mode]);

  const setPreference = useCallback(
    (prefer: 'local' | 'remote') => {
      const preferLocalValue = prefer === 'local';
      setPreferLocalState(preferLocalValue);
      localStorage.setItem(STORAGE_KEY, String(preferLocalValue));
      checkConnections();
    },
    [checkConnections],
  );

  const client = useMemo(() => {
    if (connectionStatus.mode === 'local') {
      return createLocalClient(localPort);
    }
    if (connectionStatus.mode === 'remote') {
      const proxyConfig = getProxyConfig();
      if (proxyConfig) {
        return createProxyClient(proxyConfig.url, proxyConfig.nonce);
      }
    }
    return null;
  }, [connectionStatus.mode, localPort]);

  const value = useMemo(
    () => ({
      client,
      connectionStatus,
      preferLocal,
      setPreference,
      refreshStatus: checkConnections,
    }),
    [client, connectionStatus, preferLocal, setPreference, checkConnections],
  );

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
};

export const useClient = (): ClientContextValue => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};

export const useClientOptional = (): ClientContextValue | null => {
  return useContext(ClientContext);
};

const fallbackProxyConfig = getProxyConfig();
const fallbackProxyClient = fallbackProxyConfig
  ? createProxyClient(fallbackProxyConfig.url, fallbackProxyConfig.nonce)
  : null;

export const useOpencodeClient = (): OpencodeClient | null => {
  const context = useContext(ClientContext);
  if (context) {
    return context.client;
  }

  return fallbackProxyClient;
};

export const useConnectionStatus = () => {
  const { connectionStatus, preferLocal, setPreference, refreshStatus } =
    useClient();
  return {
    ...connectionStatus,
    preferLocal,
    setPreference,
    refreshStatus,
  };
};
