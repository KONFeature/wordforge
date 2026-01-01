import { createOpencodeClient } from '@opencode-ai/sdk/client';

const config = window.wordforgeChat ?? window.wordforgeWidget;
if (!config) {
  throw new Error('CLient not configured');
}

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

export const opencodeClient = createOpencodeClient({
  baseUrl: config.proxyUrl,
  fetch: wpFetch,
});
