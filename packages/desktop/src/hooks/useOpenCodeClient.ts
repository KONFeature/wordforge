import { createOpencodeClient } from '@opencode-ai/sdk/v2/client';
import type { OpencodeClient } from '@opencode-ai/sdk/v2/client';

export type { OpencodeClient };

export function createLocalClient(port: number): OpencodeClient {
  return createOpencodeClient({
    baseUrl: `http://localhost:${port}`,
  });
}

export async function checkServerHealth(port: number): Promise<boolean> {
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

export function encodeProjectPath(path: string): string {
  return btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildOpenCodeUrl(
  port: number,
  projectPath: string,
  sessionId?: string,
): string {
  const encodedPath = encodeProjectPath(projectPath);
  const base = `http://localhost:${port}/${encodedPath}`;
  return sessionId ? `${base}/session/${sessionId}` : base;
}
