import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { OpenCodeDebugInfo, OpenCodeLogFile } from '../types';

const debugKeys = {
  all: ['opencode-debug'] as const,
  info: () => [...debugKeys.all, 'info'] as const,
  logFiles: () => [...debugKeys.all, 'log-files'] as const,
  logContent: (path: string) =>
    [...debugKeys.all, 'log-content', path] as const,
};

async function fetchDebugInfo(): Promise<OpenCodeDebugInfo> {
  return invoke<OpenCodeDebugInfo>('get_opencode_debug_info');
}

async function fetchLogFiles(): Promise<OpenCodeLogFile[]> {
  return invoke<OpenCodeLogFile[]>('list_opencode_log_files');
}

async function fetchLogContent(
  path: string,
  tailLines?: number,
): Promise<string> {
  return invoke<string>('read_opencode_log_file', {
    path,
    tailLines,
  });
}

export function useOpenCodeDebugInfo() {
  return useQuery({
    queryKey: debugKeys.info(),
    queryFn: fetchDebugInfo,
    refetchInterval: 5000,
  });
}

export function useOpenCodeLogFiles() {
  return useQuery({
    queryKey: debugKeys.logFiles(),
    queryFn: fetchLogFiles,
    refetchInterval: 10000,
  });
}

export function useOpenCodeLogContent(path: string | null, tailLines?: number) {
  return useQuery({
    queryKey: debugKeys.logContent(path ?? ''),
    queryFn: () =>
      path ? fetchLogContent(path, tailLines) : Promise.resolve(''),
    enabled: !!path,
    refetchInterval: 5000,
  });
}

export function useOpenCodeDebug() {
  const debugInfo = useOpenCodeDebugInfo();
  const logFiles = useOpenCodeLogFiles();

  return {
    debugInfo: debugInfo.data ?? null,
    logFiles: logFiles.data ?? [],
    isLoading: debugInfo.isLoading || logFiles.isLoading,
    isRefetchingLogFiles: logFiles.isFetching,
    error: debugInfo.error || logFiles.error,
    refetch: () => {
      debugInfo.refetch();
      logFiles.refetch();
    },
    refetchLogFiles: () => logFiles.refetch(),
  };
}
