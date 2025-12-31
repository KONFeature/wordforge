import { useMemo, useEffect, useRef } from '@wordpress/element';
import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk/client';

interface WordForgeConfig {
  proxyUrl: string;
  nonce: string;
}

export const useOpencodeClient = (config: WordForgeConfig): OpencodeClient => {
  const clientRef = useRef<OpencodeClient | null>(null);

  const client = useMemo(() => {
    const wpFetch = (request: Request): Promise<Response> => {
      const modifiedRequest = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'include',
      });

      console.log("Request", {
        url: modifiedRequest.url
      })
      return fetch(modifiedRequest);
    };

    return createOpencodeClient({
      baseUrl: config.proxyUrl,
      fetch: wpFetch,
    });
  }, [config.proxyUrl, config.nonce]);

  clientRef.current = client;

  useEffect(() => {
    const subscribeToEvents = async () => {
      try {
        const result = await client.event.subscribe();
        for await (const event of result.stream) {
          console.log('[WordForge SSE]', event.type, event.properties);
        }
      } catch (err) {
        console.error('[WordForge SSE] Connection error:', err);
      }
    };

    subscribeToEvents();
  }, [client]);

  return client;
};
