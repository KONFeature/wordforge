import type { Session, SessionStatus } from '@opencode-ai/sdk/v2';
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
      const result = await client!.session.create();
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
      await client!.session.delete({ sessionID: sessionId });
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

export interface RevertParams {
  sessionId: string;
  messageID: string;
  partID?: string;
}

export const useRevertSession = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useMutation({
    mutationFn: async ({ sessionId, messageID, partID }: RevertParams) => {
      const result = await client!.session.revert({
        sessionID: sessionId,
        messageID,
        partID,
      });
      return result.data!;
    },
    onMutate: async (
      { sessionId, messageID, partID },
      { client: queryClient },
    ) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions(mode) });
      const previousSessions = queryClient.getQueryData<Session[]>(
        queryKeys.sessions(mode),
      );

      queryClient.setQueryData<Session[]>(
        queryKeys.sessions(mode),
        (old) =>
          old?.map((s) =>
            s.id === sessionId ? { ...s, revert: { messageID, partID } } : s,
          ) ?? [],
      );

      return { previousSessions };
    },
    onError: (_err, _vars, context, { client: queryClient }) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(
          queryKeys.sessions(mode),
          context.previousSessions,
        );
      }
    },
    onSuccess: (updatedSession, _var, _result, { client: queryClient }) => {
      queryClient.setQueryData<Session[]>(
        queryKeys.sessions(mode),
        (old) =>
          old?.map((s) => (s.id === updatedSession.id ? updatedSession : s)) ??
          [],
      );
    },
  });
};

export const useUnrevertSession = () => {
  const client = useOpencodeClientOptional();
  const { mode } = useConnectionStatus();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await client!.session.unrevert({
        sessionID: sessionId,
      });
      return result.data!;
    },
    onMutate: async (sessionId, { client: queryClient }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions(mode) });

      const previousSessions = queryClient.getQueryData<Session[]>(
        queryKeys.sessions(mode),
      );

      queryClient.setQueryData<Session[]>(
        queryKeys.sessions(mode),
        (old) =>
          old?.map((s) =>
            s.id === sessionId ? { ...s, revert: undefined } : s,
          ) ?? [],
      );

      return { previousSessions };
    },
    onError: (_err, _vars, context, { client: queryClient }) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(
          queryKeys.sessions(mode),
          context.previousSessions,
        );
      }
    },
    onSuccess: (updatedSession, _var, _result, { client: queryClient }) => {
      queryClient.setQueryData<Session[]>(
        queryKeys.sessions(mode),
        (old) =>
          old?.map((s) => (s.id === updatedSession.id ? updatedSession : s)) ??
          [],
      );
    },
  });
};
