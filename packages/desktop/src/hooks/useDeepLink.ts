import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { DeepLinkPayload } from '../types';

export function useDeepLink(onConnect: (payload: DeepLinkPayload) => void) {
  useEffect(() => {
    const unlistenPromise = listen<DeepLinkPayload>(
      'deep-link:connect',
      (event) => {
        onConnect(event.payload);
      },
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onConnect]);
}
