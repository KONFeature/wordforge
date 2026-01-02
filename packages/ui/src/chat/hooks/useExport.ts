import type { Session } from '@opencode-ai/sdk/client';
import { useCallback } from '@wordpress/element';
import type { ChatMessage } from '../components/MessageList';

export type ExportFormat = 'json' | 'markdown';

interface ExportData {
  session: Session | null;
  messages: ChatMessage[];
  exportedAt: string;
}

const extractTextFromMessage = (message: ChatMessage): string => {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string }).text)
    .join('\n\n');
};

const formatAsMarkdown = (data: ExportData): string => {
  const lines: string[] = [];

  lines.push(`# ${data.session?.title || 'Conversation'}`);
  lines.push('');
  lines.push(`Exported: ${data.exportedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const message of data.messages) {
    const role = message.info.role === 'user' ? 'You' : 'Assistant';
    const timestamp = message.info.time?.created
      ? new Date(message.info.time.created * 1000).toLocaleString()
      : '';

    lines.push(`## ${role}`);
    if (timestamp) {
      lines.push(`*${timestamp}*`);
    }
    lines.push('');
    lines.push(extractTextFromMessage(message));
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const useExport = (session: Session | null, messages: ChatMessage[]) => {
  const exportConversation = useCallback(
    (format: ExportFormat) => {
      const data: ExportData = {
        session,
        messages,
        exportedAt: new Date().toISOString(),
      };

      const safeName = (session?.title || 'conversation')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);

      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'json') {
        const content = JSON.stringify(data, null, 2);
        downloadFile(
          content,
          `${safeName}-${timestamp}.json`,
          'application/json',
        );
      } else {
        const content = formatAsMarkdown(data);
        downloadFile(content, `${safeName}-${timestamp}.md`, 'text/markdown');
      }
    },
    [session, messages],
  );

  return { exportConversation };
};
