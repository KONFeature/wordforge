import type { Session, SessionStatus } from '@opencode-ai/sdk/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { opencodeClient } from '../../lib/openCodeClient';

export const SESSIONS_KEY = ['sessions'] as const;
export const STATUSES_KEY = ['session-statuses'] as const;

export const useSessions = () =>
  useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const result = await opencodeClient.session.list();
      const sessions = Array.isArray(result.data) ? result.data : [];
      return sessions.sort((a, b) => b.time.updated - a.time.updated);
    },
    enabled: !!opencodeClient,
  });

export const useSessionStatuses = () =>
  useQuery({
    queryKey: STATUSES_KEY,
    queryFn: async () => {
      const result = await opencodeClient.session.status();
      return (
        result.data && typeof result.data === 'object' ? result.data : {}
      ) as Record<string, SessionStatus>;
    },
    enabled: !!opencodeClient,
    refetchInterval: (query) => {
      const statuses = query.state.data;
      if (!statuses) return false;
      const hasBusy = Object.values(statuses).some(
        (s) => s.type === 'busy' || s.type === 'retry',
      );
      return hasBusy ? 2000 : false;
    },
  });

export const useCreateSession = () =>
  useMutation({
    mutationFn: async () => {
      const result = await opencodeClient.session.create({ body: {} });
      return result.data!;
    },
    onSuccess: (newSession, _var, _result, { client: queryClient }) => {
      queryClient.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
        old ? [newSession, ...old] : [newSession],
      );
    },
  });

export const useDeleteSession = () =>
  useMutation({
    mutationFn: async (sessionId: string) => {
      await opencodeClient.session.delete({ path: { id: sessionId } });
      return sessionId;
    },
    onSuccess: (deletedId, _var, _result, { client: queryClient }) => {
      queryClient.setQueryData<Session[]>(
        SESSIONS_KEY,
        (old) => old?.filter((s) => s.id !== deletedId) ?? [],
      );
    },
  });
