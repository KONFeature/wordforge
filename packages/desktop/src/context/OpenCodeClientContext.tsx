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

interface OpenCodeClientContextValue {
  client: OpencodeClient;
  port: number;
  /** Project directory, only set when provider has a site */
  projectDir: string | null;
  /** Build URL for OpenCode web UI (only works with projectDir) */
  buildUrl: (sessionId?: string) => string | null;
  /** Open in webview (only works with projectDir) */
  openInWebview: (sessionId?: string) => Promise<void>;
}

const OpenCodeClientContext = createContext<OpenCodeClientContextValue | null>(
  null,
);

interface OpenCodeProviderProps {
  /** Optional site - when provided, SDK client includes directory context */
  site?: WordPressSite;
  children: ReactNode;
}

/**
 * OpenCode SDK client provider.
 *
 * Can be used in two modes:
 * 1. **Global (no site)**: Provides client for OAuth, global config operations
 * 2. **Site-scoped (with site)**: Provides client with directory context for sessions
 *
 * Nest providers to override: root has global, site routes override with site-scoped.
 */
export function OpenCodeProvider({ site, children }: OpenCodeProviderProps) {
  const { port, status } = useOpenCodeStatus();

  const value = useMemo<OpenCodeClientContextValue | null>(() => {
    if (status !== 'running' || port === null) {
      return null;
    }

    const projectDir = site?.project_dir ?? null;

    const client = createOpencodeClient({
      baseUrl: `http://localhost:${port}`,
      ...(projectDir && { directory: projectDir }),
    });

    const buildUrl = (sessionId?: string): string | null => {
      if (!projectDir) return null;
      const encodedPath = encodeProjectPath(projectDir);
      const base = `http://localhost:${port}/${encodedPath}`;
      return sessionId ? `${base}/session/${sessionId}` : base;
    };

    const openInWebview = async (sessionId?: string): Promise<void> => {
      const url = buildUrl(sessionId);
      if (!url) {
        throw new Error('Cannot open webview without a project directory');
      }
      await invoke('open_opencode_view', { url });
    };

    return { client, port, projectDir, buildUrl, openInWebview };
  }, [status, port, site?.project_dir]);

  return (
    <OpenCodeClientContext.Provider value={value}>
      {children}
    </OpenCodeClientContext.Provider>
  );
}

/**
 * Get OpenCode client. Throws if not within provider or server not running.
 */
export function useOpenCodeClient(): OpenCodeClientContextValue {
  const context = useContext(OpenCodeClientContext);
  if (!context) {
    throw new Error(
      'useOpenCodeClient must be used within OpenCodeProvider with a running server',
    );
  }
  return context;
}

/**
 * Get OpenCode client or null if not available.
 * Use this when you need to gracefully handle missing client.
 */
export function useOpenCodeClientSafe(): OpenCodeClientContextValue | null {
  return useContext(OpenCodeClientContext);
}

// Legacy export for backwards compatibility
export { OpenCodeProvider as OpenCodeClientProvider };
