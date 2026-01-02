import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from '@wordpress/element';
import type { ReactNode } from 'react';
import {
  type ConnectionMode,
  type WordforgeConfig,
  checkLocalServerHealth,
  checkRemoteServerStatus,
  createLocalClient,
  createProxyClient,
  getConfig,
} from './openCodeClient';

export interface ConnectionStatus {
  mode: ConnectionMode;
  localAvailable: boolean;
  remoteAvailable: boolean;
  localPort: number;
}

interface ClientContextValue {
  client: OpencodeClient | null;
  connectionStatus: ConnectionStatus;
  preferLocal: boolean;
  setPreference: (prefer: 'local' | 'remote') => void;
  refetchConnectionStatus: () => void;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const STORAGE_KEY = 'wordforge_prefer_local';
const CONNECTION_STATUS_KEY = ['connection-status'] as const;

function useLocalPreference() {
  const [preferLocal, setPreferLocalState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  const setPreference = useCallback((prefer: 'local' | 'remote') => {
    const value = prefer === 'local';
    setPreferLocalState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return { preferLocal, setPreference };
}

function useConnectionStatusQuery(config: WordforgeConfig) {
  return useQuery({
    queryKey: CONNECTION_STATUS_KEY,
    queryFn: async () => {
      const [localAvailable, remoteAvailable] = await Promise.all([
        config.localEnabled
          ? checkLocalServerHealth(config.localPort)
          : Promise.resolve(false),
        config.restUrl
          ? checkRemoteServerStatus(config.restUrl, config.nonce)
          : Promise.resolve(false),
      ]);
      return { localAvailable, remoteAvailable };
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.localAvailable && !data?.remoteAvailable) return 5000;
      return 30000;
    },
  });
}

function deriveConnectionMode(
  localAvailable: boolean,
  remoteAvailable: boolean,
  preferLocal: boolean,
): ConnectionMode {
  if (preferLocal && localAvailable) return 'local';
  if (remoteAvailable) return 'remote';
  if (localAvailable) return 'local';
  return 'disconnected';
}

interface ClientProviderProps {
  children: ReactNode;
}

export const ClientProvider = ({ children }: ClientProviderProps) => {
  const config = getConfig();
  const { preferLocal, setPreference } = useLocalPreference();

  const { data: healthData, refetch: refetchConnectionStatus } =
    useConnectionStatusQuery(config);

  const localAvailable = healthData?.localAvailable ?? false;
  const remoteAvailable = healthData?.remoteAvailable ?? false;
  const mode = deriveConnectionMode(
    localAvailable,
    remoteAvailable,
    preferLocal,
  );

  const connectionStatus: ConnectionStatus = useMemo(
    () => ({
      mode,
      localAvailable,
      remoteAvailable,
      localPort: config.localPort,
    }),
    [mode, localAvailable, remoteAvailable, config.localPort],
  );

  const client = useMemo(() => {
    if (mode === 'local') {
      return createLocalClient(config.localPort);
    }
    if (mode === 'remote') {
      return createProxyClient(config.proxyUrl, config.nonce);
    }
    return null;
  }, [mode, config.localPort, config.proxyUrl, config.nonce]);

  const value = useMemo(
    () => ({
      client,
      connectionStatus,
      preferLocal,
      setPreference,
      refetchConnectionStatus: () => {
        refetchConnectionStatus();
      },
    }),
    [
      client,
      connectionStatus,
      preferLocal,
      setPreference,
      refetchConnectionStatus,
    ],
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

export const useOpencodeClient = (): OpencodeClient => {
  const { client } = useClient();
  if (!client) {
    throw new Error(
      'OpenCode client not available. Server may be disconnected.',
    );
  }
  return client;
};

export const useOpencodeClientOptional = (): OpencodeClient | null => {
  const { client } = useClient();
  return client;
};

export const useConnectionStatus = () => {
  const {
    connectionStatus,
    preferLocal,
    setPreference,
    refetchConnectionStatus,
  } = useClient();
  return {
    ...connectionStatus,
    preferLocal,
    setPreference,
    refetchConnectionStatus,
  };
};
