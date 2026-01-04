import { createOpencodeClient, type Session } from '@opencode-ai/sdk/v2/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useMemo } from 'react';

export interface SessionWithChildren extends Session {
  children: Session[];
}

interface UseSessionsParams {
  port: number | null;
  projectDir: string | null;
}

const SESSION_POLL_INTERVAL = 10000;

function encodeProjectPath(path: string): string {
  return btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildUrl(
  port: number,
  projectDir: string,
  sessionId?: string,
): string {
  const encodedPath = encodeProjectPath(projectDir);
  const base = `http://localhost:${port}/${encodedPath}`;
  return sessionId ? `${base}/session/${sessionId}` : base;
}

export function useSessions({ port, projectDir }: UseSessionsParams) {
  const queryClient = useQueryClient();
  const isEnabled = port !== null && projectDir !== null;

  const client = useMemo(() => {
    if (!port || !projectDir) return null;
    return createOpencodeClient({
      baseUrl: `http://localhost:${port}`,
      directory: projectDir,
    });
  }, [port, projectDir]);

  const queryKey = ['sessions', projectDir] as const;

  const sessionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!client) return [];
      const result = await client.session.list();
      return result.data ?? [];
    },
    enabled: isEnabled,
    refetchInterval: isEnabled ? SESSION_POLL_INTERVAL : false,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: async (title?: string) => {
      if (!client) throw new Error('Server not running');
      const result = await client.session.create({ title });
      return result.data!;
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData<Session[]>(queryKey, (old) =>
        old ? [newSession, ...old] : [newSession],
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!client) throw new Error('Server not running');
      await client.session.delete({ sessionID: sessionId });
      return sessionId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Session[]>(queryKey, (old) =>
        old
          ? old.filter((s) => s.id !== deletedId && s.parentID !== deletedId)
          : [],
      );
    },
  });

  const hierarchicalSessions = useMemo<SessionWithChildren[]>(() => {
    const sessions = sessionsQuery.data ?? [];
    const childMap = new Map<string, Session[]>();

    for (const session of sessions) {
      if (session.parentID) {
        const existing = childMap.get(session.parentID) || [];
        childMap.set(session.parentID, [...existing, session]);
      }
    }

    const parentSessions: SessionWithChildren[] = [];

    for (const session of sessions) {
      if (!session.parentID) {
        const children = childMap.get(session.id) || [];
        children.sort((a, b) => b.time.updated - a.time.updated);
        parentSessions.push({ ...session, children });
      }
    }

    parentSessions.sort((a, b) => b.time.updated - a.time.updated);
    return parentSessions;
  }, [sessionsQuery.data]);

  const openSession = async (sessionId?: string) => {
    if (!port || !projectDir) return;
    const url = buildUrl(port, projectDir, sessionId);
    await invoke('open_opencode_view', { url });
  };

  const createAndOpenSession = async (title?: string) => {
    const newSession = await createMutation.mutateAsync(title);
    await openSession(newSession.id);
    return newSession;
  };

  return {
    sessions: sessionsQuery.data ?? [],
    hierarchicalSessions,
    isLoading: sessionsQuery.isLoading,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error:
      sessionsQuery.error?.message ?? createMutation.error?.message ?? null,
    createSession: createMutation.mutateAsync,
    deleteSession: deleteMutation.mutateAsync,
    openSession,
    createAndOpenSession,
    refetch: sessionsQuery.refetch,
  };
}
