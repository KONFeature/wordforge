import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

interface RestartContextValue {
  restartRequired: boolean;
  restartReason: string | null;
  setRestartRequired: (required: boolean, reason?: string) => void;
  clearRestartRequired: () => void;
}

const RestartContext = createContext<RestartContextValue | null>(null);

export function RestartProvider({ children }: { children: ReactNode }) {
  const [restartRequired, setRestartRequiredState] = useState(false);
  const [restartReason, setRestartReason] = useState<string | null>(null);

  const setRestartRequired = useCallback(
    (required: boolean, reason?: string) => {
      setRestartRequiredState(required);
      setRestartReason(reason ?? null);
    },
    [],
  );

  const clearRestartRequired = useCallback(() => {
    setRestartRequiredState(false);
    setRestartReason(null);
  }, []);

  return (
    <RestartContext.Provider
      value={{
        restartRequired,
        restartReason,
        setRestartRequired,
        clearRestartRequired,
      }}
    >
      {children}
    </RestartContext.Provider>
  );
}

export function useRestartRequired() {
  const context = useContext(RestartContext);
  if (!context) {
    throw new Error('useRestartRequired must be used within RestartProvider');
  }
  return context;
}
