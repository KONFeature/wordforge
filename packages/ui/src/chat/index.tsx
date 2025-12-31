import { createRoot } from '@wordpress/element';
import { QueryProvider } from '../lib/QueryProvider';
import { ChatApp } from './ChatApp';

const container = document.getElementById('wordforge-chat-root');

if (container) {
  createRoot(container).render(
    <QueryProvider>
      <ChatApp />
    </QueryProvider>,
  );
}
