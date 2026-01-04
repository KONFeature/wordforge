import type { Session } from '@opencode-ai/sdk/v2/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useOpenCodeClientSafe } from '../context/OpenCodeClientContext';

export interface SessionWithChildren extends Session {
  children: Session[];
}

const SESSION_POLL_INTERVAL = 10000;

const sessionKeys = {
  all: ['sessions'] as const,
  list: (projectDir: string) =>
    [...sessionKeys.all, 'list', projectDir] as const,
};

export function useSessions() {
  const clientContext = useOpenCodeClientSafe();
  const queryClient = useQueryClient();

  const isEnabled = clientContext !== null;
  const projectDir = clientContext?.projectDir ?? '';

  const queryKey = sessionKeys.list(projectDir);

  const sessionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!clientContext) return [];
      const result = await clientContext.client.session.list();
      return result.data ?? [];
    },
    enabled: isEnabled,
    refetchInterval: isEnabled ? SESSION_POLL_INTERVAL : false,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: async (title?: string) => {
      if (!clientContext) throw new Error('Server not running');
      const result = await clientContext.client.session.create({ title });
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
      if (!clientContext) throw new Error('Server not running');
      await clientContext.client.session.delete({ sessionID: sessionId });
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
    if (!clientContext) return;
    await clientContext.openInWebview(sessionId);
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
    isServerRunning: isEnabled,
  };
}
