import type {
  Session,
  SessionPromptData,
  SessionStatus,
} from '@opencode-ai/sdk/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SelectedModel } from '../../components/ModelSelector';
import {
  useConnectionStatus,
  useOpencodeClientOptional,
} from '../../lib/ClientProvider';
import { queryKeys } from '../../lib/queryKeys';
import type { ChatMessage } from '../components/MessageList';
import { sanitizeMessage } from '../utils/msgSanitizer';
import {
  type ScopedContext,
  formatContextXml,
  shouldIncludeContext,
} from './useContextInjection';

export const useMessages = (sessionId: string | null) => {
  const client = useOpencodeClientOptional();
  const queryClient = useQueryClient();
  const { mode } = useConnectionStatus();

  return useQuery({
    queryKey: queryKeys.messages(mode, sessionId!),
    queryFn: async () => {
      const result = await client!.session.messages({
        path: { id: sessionId! },
        query: {
          limit: 100,
        },
      });

      const rawMessages = result.data || [];

      const validMessages: ChatMessage[] = [];
      for (let i = 0; i < rawMessages.length; i++) {
        const sanitized = sanitizeMessage(rawMessages[i], i);
        if (sanitized) {
          validMessages.push(sanitized);
        }
      }

      return validMessages;
    },
    enabled: !!client && !!sessionId,
    gcTime: 0,
    staleTime: 0,
    refetchInterval: () => {
      if (!sessionId) return false;
      const statuses = queryClient.getQueryData<Record<string, SessionStatus>>(
        queryKeys.statuses(mode),
      );
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
  const { mode } = useConnectionStatus();

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

        queryClient.setQueryData<Session[]>(queryKeys.sessions(mode), (old) =>
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
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages(mode, sessionId),
      });
      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.messages(mode, sessionId),
        (old) => [...(old || []), tempUserMsg],
      );

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
          queryClient.invalidateQueries({ queryKey: queryKeys.sessions(mode) }),
        );
      }
      promises.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.statuses(mode) }),
      );
      promises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.messages(mode, result.sessionId),
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
