import {
  createOpencodeClient,
  type OpencodeClient,
} from '@opencode-ai/sdk/v2/client';
import { invoke } from '@tauri-apps/api/core';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

function encodeProjectPath(path: string): string {
  return btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
  port: number;
  projectDir: string;
  children: ReactNode;
}

export function OpenCodeClientProvider({
  port,
  projectDir,
  children,
}: OpenCodeClientProviderProps) {
  const value = useMemo<OpenCodeClientContextValue>(() => {
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
  }, [port, projectDir]);

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
      'useOpenCodeClient must be used within OpenCodeClientProvider',
    );
  }
  return context;
}
