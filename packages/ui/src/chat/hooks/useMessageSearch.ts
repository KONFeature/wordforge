import { useMemo, useState } from '@wordpress/element';
import type { ChatMessage } from '../components/MessageList';

export interface UseMessageSearchResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMessages: ChatMessage[];
  isSearching: boolean;
  matchCount: number;
  clearSearch: () => void;
}

const extractTextFromMessage = (message: ChatMessage): string => {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string }).text)
    .join(' ')
    .toLowerCase();
};

export const useMessageSearch = (
  messages: ChatMessage[],
): UseMessageSearchResult => {
  const [searchQuery, setSearchQuery] = useState('');

  const { filteredMessages, matchCount } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredMessages: messages, matchCount: 0 };
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = messages.filter((message) => {
      const text = extractTextFromMessage(message);
      return text.includes(query);
    });

    return { filteredMessages: filtered, matchCount: filtered.length };
  }, [messages, searchQuery]);

  const clearSearch = () => setSearchQuery('');

  return {
    searchQuery,
    setSearchQuery,
    filteredMessages,
    isSearching: searchQuery.trim().length > 0,
    matchCount,
    clearSearch,
  };
};
