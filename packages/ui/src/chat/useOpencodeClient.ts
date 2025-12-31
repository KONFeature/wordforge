import {
  type OpencodeClient,
  createOpencodeClient,
} from '@opencode-ai/sdk/client';
import { useMemo } from '@wordpress/element';

interface WordForgeConfig {
  proxyUrl: string;
  nonce: string;
}

export const useOpencodeClient = (config: WordForgeConfig): OpencodeClient => {
  const client = useMemo(() => {
    const wpFetch = (request: Request): Promise<Response> => {
      const modifiedRequest = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'include',
      });
      return fetch(modifiedRequest);
    };

    return createOpencodeClient({
      baseUrl: config.proxyUrl,
      fetch: wpFetch,
    });
  }, [config.proxyUrl, config.nonce]);

  return client;
};
