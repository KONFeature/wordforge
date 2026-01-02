import { createOpencodeClient } from '@opencode-ai/sdk/client';
import type { OpencodeClient } from '@opencode-ai/sdk/client';

export type ConnectionMode = 'local' | 'remote' | 'disconnected';

interface ProxyConfig {
  url: string;
  nonce: string;
}

export function getProxyConfig(): ProxyConfig | null {
  const chatConfig =
    window.wordforgeChat ?? window.wordforgeWidget ?? window.wordforgeEditor;

  if (chatConfig) {
    return {
      url: chatConfig.proxyUrl,
      nonce: chatConfig.nonce,
    };
  }

  if (window.wordforgeSettings) {
    return {
      url: `${window.wordforgeSettings.restUrl}/opencode/proxy`,
      nonce: window.wordforgeSettings.nonce,
    };
  }

  return null;
}

export function getLocalPort(): number {
  return window.wordforgeSettings?.settings?.localServerPort ?? 4096;
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

const defaultProxyConfig = getProxyConfig();
export const opencodeClient = defaultProxyConfig
  ? createProxyClient(defaultProxyConfig.url, defaultProxyConfig.nonce)
  : null;
