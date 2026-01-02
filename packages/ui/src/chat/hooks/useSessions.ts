import type { Session, SessionStatus } from '@opencode-ai/sdk/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  useConnectionStatus,
  useOpencodeClientOptional,
} from '../../lib/ClientProvider';
import { queryKeys } from '../../lib/queryKeys';

export const useSessions = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useQuery({
    queryKey: queryKeys.sessions(mode),
    queryFn: async () => {
      const result = await client!.session.list();
      const sessions = Array.isArray(result.data) ? result.data : [];
      return sessions.sort((a, b) => b.time.updated - a.time.updated);
    },
    enabled: !!client,
  });
};

export const useSessionStatuses = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useQuery({
    queryKey: queryKeys.statuses(mode),
    queryFn: async () => {
      const result = await client!.session.status();
      return (
        result.data && typeof result.data === 'object' ? result.data : {}
      ) as Record<string, SessionStatus>;
    },
    enabled: !!client,
    refetchInterval: (query) => {
      const statuses = query.state.data;
      if (!statuses) return false;
      const hasBusy = Object.values(statuses).some(
        (s) => s.type === 'busy' || s.type === 'retry',
      );
      return hasBusy ? 2000 : false;
    },
  });
};

export const useCreateSession = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useMutation({
    mutationFn: async () => {
      const result = await client!.session.create({ body: {} });
      return result.data!;
    },
    onSuccess: (newSession, _var, _result, { client: queryClient }) => {
      queryClient.setQueryData<Session[]>(queryKeys.sessions(mode), (old) =>
        old ? [newSession, ...old] : [newSession],
      );
    },
  });
};

export const useDeleteSession = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await client!.session.delete({ path: { id: sessionId } });
      return sessionId;
    },
    onSuccess: (deletedId, _var, _result, { client: queryClient }) => {
      queryClient.setQueryData<Session[]>(
        queryKeys.sessions(mode),
        (old) => old?.filter((s) => s.id !== deletedId) ?? [],
      );
    },
  });
};
