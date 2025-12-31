import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { useEffect, useRef, useState } from '@wordpress/element';
import { injectScopedContext, type ScopedContext } from './useContextInjection';

export const useAutoContextInjection = (
  client: OpencodeClient | null,
  sessionId: string | null,
  context: ScopedContext | null,
) => {
  const [injected, setInjected] = useState(false);
  const lastSessionRef = useRef<string | null>(null);
  const lastContextRef = useRef<ScopedContext | null>(null);

  useEffect(() => {
    if (!client || !sessionId || !context) {
      setInjected(false);
      return;
    }

    const sessionChanged = lastSessionRef.current !== sessionId;
    const contextChanged =
      JSON.stringify(lastContextRef.current) !== JSON.stringify(context);

    if (sessionChanged || contextChanged) {
      lastSessionRef.current = sessionId;
      lastContextRef.current = context;
      setInjected(false);

      injectScopedContext(client, sessionId, context)
        .then(() => setInjected(true))
        .catch(() => setInjected(false));
    }
  }, [client, sessionId, context]);

  return { injected };
};
