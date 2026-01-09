import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import type { BlockSpec } from '../types/gutenberg';
import { useBlockActions } from './useBlockActions';
import { useGutenbergBridge } from './useGutenbergBridge';

const PLUGIN_SERVER_URL = 'http://localhost:9876';
const POLL_INTERVAL_MS = 500;

interface PendingRequest {
  id: string;
  tool: string;
  args: unknown;
}

interface PluginBridgeStatus {
  connected: boolean;
  pendingRequests: number;
  lastPoll: number | null;
  lastError: string | null;
}

export interface UseGutenbergPluginBridgeResult {
  status: PluginBridgeStatus;
  isActive: boolean;
  start: () => void;
  stop: () => void;
}

export const useGutenbergPluginBridge = (): UseGutenbergPluginBridgeResult => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<PluginBridgeStatus>({
    connected: false,
    pendingRequests: 0,
    lastPoll: null,
    lastError: null,
  });

  const pollTimeoutRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  const { isAvailable, blockTypes } = useGutenbergBridge();
  const blockActions = useBlockActions();

  const postResult = useCallback(
    async (id: string, result?: unknown, error?: string) => {
      try {
        await fetch(`${PLUGIN_SERVER_URL}/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, result, error }),
        });
      } catch {
        console.error('[GutenbergBridge] Failed to post result');
      }
    },
    [],
  );

  const executeToolRequest = useCallback(
    async (request: PendingRequest) => {
      const { id, tool, args } = request;

      try {
        switch (tool) {
          case 'gutenberg/insert-blocks': {
            const { blocks, position } = args as {
              blocks: BlockSpec[];
              position?: number;
            };
            const result = blockActions.insertBlocks(blocks, { position });
            await postResult(id, {
              success: result.success,
              insertedCount: result.data?.insertedCount,
              error: result.error,
            });
            break;
          }

          case 'gutenberg/list-all-blocks': {
            await postResult(id, {
              success: true,
              data: blockTypes.map((b) => ({
                name: b.name,
                title: b.title,
                category: b.category,
                description: b.description,
              })),
            });
            break;
          }

          case 'gutenberg/serialize-blocks': {
            const { blocks } = args as { blocks: BlockSpec[] };
            const result = blockActions.serializeBlocks(blocks);
            await postResult(id, {
              success: result.success,
              serialized: result.data?.serialized,
              error: result.error,
            });
            break;
          }

          case 'gutenberg/get-current-blocks': {
            const currentBlocks = blockActions.getCurrentBlocks();
            const simplifiedBlocks = currentBlocks.map((block) => ({
              clientId: block.clientId,
              name: block.name,
              attributes: block.attributes,
              innerBlocks: block.innerBlocks,
            }));
            await postResult(id, {
              success: true,
              data: simplifiedBlocks,
            });
            break;
          }

          default:
            await postResult(id, undefined, `Unknown tool: ${tool}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await postResult(id, undefined, errorMsg);
      }
    },
    [blockActions, blockTypes, postResult],
  );

  const poll = useCallback(async () => {
    if (!isPollingRef.current || !isAvailable) return;

    try {
      const response = await fetch(`${PLUGIN_SERVER_URL}/pending`);
      const data = (await response.json()) as {
        pending: PendingRequest | null;
      };

      setStatus((prev) => ({
        ...prev,
        connected: true,
        lastPoll: Date.now(),
        lastError: null,
      }));

      if (data.pending) {
        await executeToolRequest(data.pending);
      }
    } catch {
      setStatus((prev) => ({
        ...prev,
        connected: false,
        lastError: 'Plugin server not reachable',
      }));
    }

    if (isPollingRef.current) {
      pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, [isAvailable, executeToolRequest]);

  const start = useCallback(() => {
    if (!isAvailable) {
      setStatus((prev) => ({
        ...prev,
        lastError: 'Gutenberg API not available',
      }));
      return;
    }

    setIsActive(true);
    isPollingRef.current = true;
    poll();
  }, [isAvailable, poll]);

  const stop = useCallback(() => {
    setIsActive(false);
    isPollingRef.current = false;
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setStatus((prev) => ({ ...prev, connected: false }));
  }, []);

  useEffect(() => {
    return () => {
      isPollingRef.current = false;
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    isActive,
    start,
    stop,
  };
};
