import type { PendingRequest, WaitForBrowser } from './types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export interface BrowserServer {
  server: ReturnType<typeof Bun.serve>;
  waitForBrowser: WaitForBrowser;
  stop: () => void;
}

export function createBrowserServer(port: number): BrowserServer {
  const pending = new Map<string, PendingRequest>();
  const queue: string[] = [];

  const server = Bun.serve({
    port,
    fetch: async (req) => {
      const url = new URL(req.url);

      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
      }

      if (url.pathname === '/pending' && req.method === 'GET') {
        const nextId = queue.shift();
        if (!nextId) {
          return Response.json({ pending: null }, { headers: CORS_HEADERS });
        }

        const request = pending.get(nextId);
        if (!request) {
          return Response.json({ pending: null }, { headers: CORS_HEADERS });
        }

        return Response.json(
          {
            pending: {
              id: request.id,
              tool: request.tool,
              args: request.args,
            },
          },
          { headers: CORS_HEADERS },
        );
      }

      if (url.pathname === '/result' && req.method === 'POST') {
        const body = (await req.json()) as {
          id: string;
          result?: unknown;
          error?: string;
        };

        const request = pending.get(body.id);
        if (request) {
          if (body.error) {
            request.reject(new Error(body.error));
          } else {
            request.resolve(body.result);
          }
          pending.delete(body.id);
        }

        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      if (url.pathname === '/status' && req.method === 'GET') {
        return Response.json(
          {
            status: 'ready',
            pending: pending.size,
            queue: queue.length,
          },
          { headers: CORS_HEADERS },
        );
      }

      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    },
  });

  const waitForBrowser: WaitForBrowser = <T>(
    tool: string,
    args: unknown,
    timeout = 30000,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();

      const request: PendingRequest = {
        id,
        tool,
        args,
        resolve: resolve as (result: unknown) => void,
        reject,
        timestamp: Date.now(),
      };

      pending.set(id, request);
      queue.push(id);

      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          const idx = queue.indexOf(id);
          if (idx > -1) queue.splice(idx, 1);
          reject(
            new Error(
              `Browser timeout for ${tool}. Make sure the WordPress editor is open in your browser.`,
            ),
          );
        }
      }, timeout);
    });
  };

  const stop = () => {
    server.stop();
  };

  return { server, waitForBrowser, stop };
}
