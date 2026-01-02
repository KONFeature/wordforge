import { createOpencodeClient } from '@opencode-ai/sdk/client';
import type { OpencodeClient } from '@opencode-ai/sdk/client';

export type ConnectionMode = 'local' | 'remote' | 'disconnected';

export interface WordforgeConfig {
  proxyUrl: string;
  nonce: string;
  restUrl: string;
  localPort: number;
  localEnabled: boolean;
}

/**
 * Get WordPress config from window globals.
 * Throws if no config is available.
 */
export function getConfig(): WordforgeConfig {
  const chatConfig =
    window.wordforgeChat ?? window.wordforgeWidget ?? window.wordforgeEditor;
  const settingsConfig = window.wordforgeSettings;

  if (!chatConfig && !settingsConfig) {
    throw new Error(
      'WordForge configuration not found. Ensure the provider is used within a WordPress admin page.',
    );
  }

  const nonce = chatConfig?.nonce ?? settingsConfig?.nonce ?? '';
  const restUrl = chatConfig?.restUrl ?? settingsConfig?.restUrl ?? '';

  let proxyUrl = '';
  if (chatConfig) {
    proxyUrl = chatConfig.proxyUrl;
  } else if (settingsConfig) {
    proxyUrl = `${settingsConfig.restUrl}/opencode/proxy`;
  }

  const localPort =
    chatConfig?.localServerPort ??
    settingsConfig?.settings?.localServerPort ??
    4096;

  const localEnabled =
    chatConfig?.localServerEnabled ??
    settingsConfig?.settings?.localServerEnabled ??
    true;

  return {
    proxyUrl,
    nonce,
    restUrl,
    localPort,
    localEnabled,
  };
}

function createWpFetch(nonce: string) {
  return (request: Request): Promise<Response> => {
    const modifiedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'X-WP-Nonce': nonce,
      },
      credentials: 'include',
    });
    return fetch(modifiedRequest);
  };
}

export function createProxyClient(
  proxyUrl: string,
  nonce: string,
): OpencodeClient {
  return createOpencodeClient({
    baseUrl: proxyUrl,
    fetch: createWpFetch(nonce),
  });
}

export function createLocalClient(port = 4096): OpencodeClient {
  return createOpencodeClient({
    baseUrl: `http://localhost:${port}`,
  });
}

export async function checkLocalServerHealth(port = 4096): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/global/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkRemoteServerStatus(
  restUrl: string,
  nonce: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${restUrl}/opencode/status`, {
      method: 'GET',
      headers: { 'X-WP-Nonce': nonce },
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
