import type { ChatMessage, MessageTurn } from './types';
import { isAssistantMessage, isUserMessage } from './types';

export function groupMessagesIntoTurns(messages: ChatMessage[]): MessageTurn[] {
  const turns: MessageTurn[] = [];
  const userMessages = messages.filter((m) => isUserMessage(m.info));

  for (const userMsg of userMessages) {
    const assistantMsgs = messages.filter(
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
