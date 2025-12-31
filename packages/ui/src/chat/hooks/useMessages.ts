import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '../components/MessageList';
import type { SelectedModel } from '../components/ModelSelector';

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
  model?: SelectedModel;
}

export const useSendMessage = (
  client: OpencodeClient | null,
  sessionId: string | null,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text, model }: SendMessageParams) => {
      const body: {
        parts: Array<{ type: 'text'; text: string }>;
        model?: SelectedModel;
      } = {
        parts: [{ type: 'text', text }],
      };
      if (model) body.model = model;

      await client!.session.prompt({ path: { id: sessionId! }, body });

      const result = await client!.session.messages({
        path: { id: sessionId! },
      });
      return result.data as ChatMessage[];
    },
    onMutate: async ({ text }) => {
      const tempUserMsg: ChatMessage = {
        info: {
          id: `temp-user-${Date.now()}`,
          sessionID: sessionId!,
          role: 'user',
          time: { created: Date.now() / 1000 },
          agent: 'build',
          model: { providerID: '', modelID: '' },
        },
        parts: [
          {
            id: `temp-part-${Date.now()}`,
            type: 'text',
            text,
            messageID: 'temp',
            sessionID: sessionId!,
          },
        ],
      };

      await queryClient.cancelQueries({ queryKey: messagesKey(sessionId!) });
      const previous = queryClient.getQueryData<ChatMessage[]>(
        messagesKey(sessionId!),
      );
      queryClient.setQueryData<ChatMessage[]>(
        messagesKey(sessionId!),
        (old) => [...(old || []), tempUserMsg],
      );

      return { previous };
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData(messagesKey(sessionId!), newMessages);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messagesKey(sessionId!), context.previous);
      }
    },
  });
};

export const useAbortSession = (
  client: OpencodeClient | null,
  sessionId: string | null,
) => {
  return useMutation({
    mutationFn: async () => {
      await client!.session.abort({ path: { id: sessionId! } });
    },
  });
};
