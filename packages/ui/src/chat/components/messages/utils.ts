import type { ChatMessage, MessageTurn } from './types';
import { isAssistantMessage, isUserMessage } from './types';

const isValidMessage = (m: ChatMessage): boolean =>
  m != null && m.info != null && typeof m.info === 'object';

export function groupMessagesIntoTurns(messages: ChatMessage[]): MessageTurn[] {
  const turns: MessageTurn[] = [];

  const validMessages = messages.filter(isValidMessage);
  const userMessages = validMessages.filter((m) => isUserMessage(m.info));

  for (const userMsg of userMessages) {
    if (!userMsg.info?.id) continue;

    const assistantMsgs = validMessages.filter(
      (m) => isAssistantMessage(m.info) && m.info.parentID === userMsg.info.id,
    );

    const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
    const isComplete =
      lastAssistant &&
      isAssistantMessage(lastAssistant.info) &&
      lastAssistant.info.finish === 'stop';

    turns.push({
      userMessage: userMsg,
      assistantMessages: assistantMsgs,
      isComplete,
    });
  }

  return turns;
}
