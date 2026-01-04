import {
  type OpencodeClient,
  createOpencodeClient,
} from '@opencode-ai/sdk/v2/client';
import { invoke } from '@tauri-apps/api/core';
import { type ReactNode, createContext, useContext, useMemo } from 'react';
import { useOpenCodeStatus } from '../hooks/useOpenCode';
import type { WordPressSite } from '../types';

function encodeProjectPath(path: string): string {
  return btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface OpenCodeConnection {
  port: number;
  projectDir: string;
  isReady: true;
}

interface OpenCodeClientContextValue {
  client: OpencodeClient;
  port: number;
  projectDir: string;
  buildUrl: (sessionId?: string) => string;
  openInWebview: (sessionId?: string) => Promise<void>;
}

const OpenCodeClientContext = createContext<OpenCodeClientContextValue | null>(
  null,
);

interface OpenCodeClientProviderProps {
  site: WordPressSite;
  children: ReactNode;
}

function useOpenCodeConnection(site: WordPressSite): OpenCodeConnection | null {
  const { port, status } = useOpenCodeStatus();

  if (status !== 'running' || port === null) {
    return null;
  }

  return {
    port,
    projectDir: site.project_dir,
    isReady: true,
  };
}

export function OpenCodeClientProvider({
  site,
  children,
}: OpenCodeClientProviderProps) {
  const connection = useOpenCodeConnection(site);

  const value = useMemo<OpenCodeClientContextValue | null>(() => {
    if (!connection) return null;

    const { port, projectDir } = connection;

    const client = createOpencodeClient({
      baseUrl: `http://localhost:${port}`,
      directory: projectDir,
    });

    const buildUrl = (sessionId?: string): string => {
      const encodedPath = encodeProjectPath(projectDir);
      const base = `http://localhost:${port}/${encodedPath}`;
      return sessionId ? `${base}/session/${sessionId}` : base;
    };

    const openInWebview = async (sessionId?: string): Promise<void> => {
      const url = buildUrl(sessionId);
      await invoke('open_opencode_view', { url });
    };

    return { client, port, projectDir, buildUrl, openInWebview };
  }, [connection]);

  return (
    <OpenCodeClientContext.Provider value={value}>
      {children}
    </OpenCodeClientContext.Provider>
  );
}

export function useOpenCodeClient(): OpenCodeClientContextValue {
  const context = useContext(OpenCodeClientContext);
  if (!context) {
    throw new Error(
      'useOpenCodeClient must be used within OpenCodeClientProvider with a running server',
    );
  }
  return context;
}

export function useOpenCodeClientSafe(): OpenCodeClientContextValue | null {
  return useContext(OpenCodeClientContext);
}
