import type {
  OpencodeClient,
  Session,
  SessionStatus,
} from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const SESSIONS_KEY = ['sessions'] as const;
export const STATUSES_KEY = ['session-statuses'] as const;

export const useSessions = (client: OpencodeClient | null) => {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const result = await client!.session.list();
      const sessions = Array.isArray(result.data) ? result.data : [];
      return sessions.sort((a, b) => b.time.updated - a.time.updated);
    },
    enabled: !!client,
  });
};

export const useSessionStatuses = (client: OpencodeClient | null) => {
  return useQuery({
    queryKey: STATUSES_KEY,
    queryFn: async () => {
      const result = await client!.session.status();
      return (
        result.data && typeof result.data === 'object' ? result.data : {}
      ) as Record<string, SessionStatus>;
    },
    enabled: !!client,
  });
};

export const useCreateSession = (client: OpencodeClient | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await client!.session.create({ body: {} });
      return result.data!;
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
        old ? [newSession, ...old] : [newSession],
      );
    },
  });
};

export const useDeleteSession = (client: OpencodeClient | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await client!.session.delete({ path: { id: sessionId } });
      return sessionId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Session[]>(
        SESSIONS_KEY,
        (old) => old?.filter((s) => s.id !== deletedId) ?? [],
      );
    },
  });
};
