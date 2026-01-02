import { createRoot } from '@wordpress/element';
import '../styles/variables.css';
import { ClientProvider } from '../lib/ClientProvider';
import { QueryProvider } from '../lib/QueryProvider';
import { ChatApp } from './ChatApp';

const container = document.getElementById('wordforge-chat-root');

if (container) {
  createRoot(container).render(
    <QueryProvider>
      <ClientProvider>
        <ChatApp />
      </ClientProvider>
    </QueryProvider>,
  );
}
