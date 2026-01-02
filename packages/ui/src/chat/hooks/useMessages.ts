import type {
  Session,
  SessionPromptData,
  SessionStatus,
} from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOpencodeClientOptional } from '../../lib/ClientProvider';
import type { ChatMessage } from '../components/MessageList';
import type { SelectedModel } from '../components/ModelSelector';
import {
  type ScopedContext,
  formatContextXml,
  shouldIncludeContext,
} from './useContextInjection';
import { SESSIONS_KEY, STATUSES_KEY } from './useSessions';

export const messagesKey = (sessionId: string) =>
  ['messages', sessionId] as const;

export const useMessages = (sessionId: string | null) => {
  const client = useOpencodeClientOptional();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: messagesKey(sessionId!),
    queryFn: async () => {
      const result = await client!.session.messages({
        path: { id: sessionId! },
      });
      return (result.data || []) as ChatMessage[];
    },
    enabled: !!client && !!sessionId,
    refetchInterval: () => {
      if (!sessionId) return false;
      const statuses =
        queryClient.getQueryData<Record<string, SessionStatus>>(STATUSES_KEY);
      const status = statuses?.[sessionId];
      const isBusy = status?.type === 'busy' || status?.type === 'retry';
      return isBusy ? 2000 : false;
    },
  });
};

interface SendMessageParams {
  text: string;
  sessionId?: string;
  model?: SelectedModel;
  context?: ScopedContext | null;
  messages?: ChatMessage[];
}

export interface SendMessageResult {
  sessionId: string;
  isNewSession: boolean;
}

export const useSendMessage = () => {
  const client = useOpencodeClientOptional();

  return useMutation({
    mutationFn: async (
      {
        text,
        sessionId: providedSessionId,
        model,
        context,
        messages = [],
      }: SendMessageParams,
      { client: queryClient },
    ): Promise<SendMessageResult> => {
      if (!client) {
        throw new Error('OpenCode client not available');
      }

      let sessionId = providedSessionId;
      let isNewSession = false;

      const parts: { type: 'text'; text: string }[] = [];
      if (context) {
        const contextXml = formatContextXml(context);
        if (shouldIncludeContext(messages, contextXml)) {
          parts.push({ type: 'text', text: contextXml });
        }
      }
      parts.push({ type: 'text', text });
      const body: SessionPromptData['body'] = {
        parts,
        model,
      };

      if (!sessionId) {
        const createResult = await client.session.create({ body: {} });
        const newSession = createResult.data!;
        sessionId = newSession.id;
        isNewSession = true;

        queryClient.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
          old ? [newSession, ...old] : [newSession],
        );
      }

      const tempUserMsg: ChatMessage = {
        info: {
          id: `temp-user-${Date.now()}`,
          sessionID: sessionId,
          role: 'user',
          time: { created: Date.now() / 1000 },
          agent: 'wordpress-manager',
          model: { providerID: '', modelID: '' },
        },
        parts: parts.map((p) => ({
          ...p,
          id: `temp-part-${Date.now()}`,
          messageID: 'temp',
          sessionID: sessionId,
        })),
      };
      await queryClient.cancelQueries({ queryKey: messagesKey(sessionId) });
      queryClient.setQueryData<ChatMessage[]>(messagesKey(sessionId), (old) => [
        ...(old || []),
        tempUserMsg,
      ]);

      await client.session.promptAsync({
        path: { id: sessionId },
        body,
      });

      return {
        sessionId,
        isNewSession,
      };
    },
    onSuccess: async (result, _params, _error, { client: queryClient }) => {
      const promises = [];
      if (result.isNewSession) {
        promises.push(
          queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
        );
      }
      promises.push(queryClient.invalidateQueries({ queryKey: STATUSES_KEY }));
      promises.push(
        queryClient.invalidateQueries({
          queryKey: messagesKey(result.sessionId),
        }),
      );
      await Promise.allSettled(promises);
    },
  });
};

export const useAbortSession = () => {
  const client = useOpencodeClientOptional();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!client) {
        throw new Error('OpenCode client not available');
      }
      await client.session.abort({ path: { id: sessionId } });
    },
  });
};
