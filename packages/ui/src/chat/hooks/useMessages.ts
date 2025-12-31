import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '../components/MessageList';
import type { SelectedModel } from '../components/ModelSelector';
import {
  type ScopedContext,
  formatContextXml,
  shouldIncludeContext,
} from './useContextInjection';

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
  sessionId: string;
  model?: SelectedModel;
  context?: ScopedContext | null;
  messages?: ChatMessage[];
}

export const useSendMessage = (client: OpencodeClient | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      sessionId,
      model,
      context,
      messages = [],
    }: SendMessageParams) => {
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
      return result.data as ChatMessage[];
    },
    onMutate: async ({ text, sessionId }) => {
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
    onSuccess: (newMessages, { sessionId }) => {
      queryClient.setQueryData(messagesKey(sessionId), newMessages);
    },
    onError: (_err, { sessionId }, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(messagesKey(sessionId), ctx.previous);
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
