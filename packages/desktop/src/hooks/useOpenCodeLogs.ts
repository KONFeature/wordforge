import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../types';

const MAX_LOG_ENTRIES = 500;

export function useOpenCodeLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const logsRef = useRef<LogEntry[]>([]);

  const addLog = useCallback((level: 'stdout' | 'stderr', message: string) => {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
    };

    logsRef.current = [...logsRef.current, entry].slice(-MAX_LOG_ENTRIES);
    setLogs(logsRef.current);
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  useEffect(() => {
    let unlistenLog: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const setup = async () => {
      unlistenLog = await listen<string>('opencode:log', (event) => {
        addLog('stdout', event.payload);
      });

      unlistenError = await listen<string>('opencode:error', (event) => {
        addLog('stderr', event.payload);
      });

      setIsListening(true);
    };

    setup();

    return () => {
      unlistenLog?.();
      unlistenError?.();
      setIsListening(false);
    };
  }, [addLog]);

  return {
    logs,
    isListening,
    clearLogs,
    logCount: logs.length,
    hasErrors: logs.some((l) => l.level === 'stderr'),
  };
}
