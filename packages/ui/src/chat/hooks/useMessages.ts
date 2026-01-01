import type {
  Session,
  SessionPromptData,
  SessionStatus,
} from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '../components/MessageList';
import type { SelectedModel } from '../components/ModelSelector';
import { opencodeClient } from '../openCodeClient';
import {
  type ScopedContext,
  formatContextXml,
  shouldIncludeContext,
} from './useContextInjection';
import { SESSIONS_KEY, STATUSES_KEY } from './useSessions';

export const messagesKey = (sessionId: string) =>
  ['messages', sessionId] as const;

export const useMessages = (sessionId: string | null) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: messagesKey(sessionId!),
    queryFn: async () => {
      const result = await opencodeClient.session.messages({
        path: { id: sessionId! },
      });
      return (result.data || []) as ChatMessage[];
    },
    enabled: !!opencodeClient && !!sessionId,
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

export const useSendMessage = () =>
  useMutation({
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
      let sessionId = providedSessionId;
      let isNewSession = false;

      // Build user msg
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
        const createResult = await opencodeClient.session.create({ body: {} });
        const newSession = createResult.data!;
        sessionId = newSession.id;
        isNewSession = true;

        // Add the session to the list
        queryClient.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
          old ? [newSession, ...old] : [newSession],
        );
      }

      // Add the user msg to the session list (for reactive update)
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

      await opencodeClient.session.promptAsync({
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

export const useAbortSession = () =>
  useMutation({
    mutationFn: async (sessionId: string) => {
      await opencodeClient.session.abort({ path: { id: sessionId } });
    },
  });
