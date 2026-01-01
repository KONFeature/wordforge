import type { OpencodeClient, Session } from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '../components/MessageList';
import type { SelectedModel } from '../components/ModelSelector';
import {
  type ScopedContext,
  formatContextXml,
  shouldIncludeContext,
} from './useContextInjection';
import { SESSIONS_KEY } from './useSessions';

export const messagesKey = (sessionId: string) =>
  ['messages', sessionId] as const;

export const useMessages = (
  client: OpencodeClient | null,
  sessionId: string | null,
) => {
  return useQuery({
    queryKey: messagesKey(sessionId!),
    queryFn: async () => {
      const result = await client!.session.messages({
        path: { id: sessionId! },
      });
      return (result.data || []) as ChatMessage[];
    },
    enabled: !!client && !!sessionId,
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
  messages: ChatMessage[];
  isNewSession: boolean;
}

export const useSendMessage = (client: OpencodeClient | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      sessionId: providedSessionId,
      model,
      context,
      messages = [],
    }: SendMessageParams): Promise<SendMessageResult> => {
      let sessionId = providedSessionId;
      let isNewSession = false;

      if (!sessionId) {
        const createResult = await client!.session.create({ body: {} });
        const newSession = createResult.data!;
        sessionId = newSession.id;
        isNewSession = true;

        queryClient.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
          old ? [newSession, ...old] : [newSession],
        );
      }

      const parts: { type: 'text'; text: string }[] = [];

      if (context) {
        const contextXml = formatContextXml(context);
        if (shouldIncludeContext(messages, contextXml)) {
          parts.push({ type: 'text', text: contextXml });
        }
      }

      parts.push({ type: 'text', text });

      const body: {
        parts: { type: 'text'; text: string }[];
        model?: SelectedModel;
      } = { parts };
      if (model) body.model = model;

      await client!.session.prompt({ path: { id: sessionId }, body });

      const result = await client!.session.messages({
        path: { id: sessionId },
      });

      return {
        sessionId,
        messages: result.data as ChatMessage[],
        isNewSession,
      };
    },
    onMutate: async ({ text, sessionId }) => {
      if (!sessionId) {
        return { previous: undefined, sessionId: undefined };
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
        parts: [
          {
            id: `temp-part-${Date.now()}`,
            type: 'text',
            text,
            messageID: 'temp',
            sessionID: sessionId,
          },
        ],
      };

      await queryClient.cancelQueries({ queryKey: messagesKey(sessionId) });
      const previous = queryClient.getQueryData<ChatMessage[]>(
        messagesKey(sessionId),
      );
      queryClient.setQueryData<ChatMessage[]>(messagesKey(sessionId), (old) => [
        ...(old || []),
        tempUserMsg,
      ]);

      return { previous, sessionId };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(messagesKey(result.sessionId), result.messages);
      if (result.isNewSession) {
        queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      }
    },
    onError: (_err, _params, ctx) => {
      if (ctx?.previous && ctx?.sessionId) {
        queryClient.setQueryData(messagesKey(ctx.sessionId), ctx.previous);
      }
    },
  });
};

export const useAbortSession = (client: OpencodeClient | null) => {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await client!.session.abort({ path: { id: sessionId } });
    },
  });
};
