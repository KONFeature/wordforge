import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'wordforge:debug-mode';

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

export function useDebugMode(): [boolean, (enabled: boolean) => void] {
  const debugMode = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setDebugMode = useCallback((enabled: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return [debugMode, setDebugMode];
}
