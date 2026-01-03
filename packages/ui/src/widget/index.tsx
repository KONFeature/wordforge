import { createRoot } from '@wordpress/element';
import { ChatWidget } from '../chat/components/ChatWidget';
import { ClientProvider } from '../lib/ClientProvider';
import { QueryProvider } from '../lib/QueryProvider';
import '../styles/variables.css';

const WidgetApp = () => {
  const config = window.wordforgeWidget;

  if (!config) {
    return null;
  }

  return <ChatWidget context={config.context} />;
};

const container = document.getElementById('wordforge-widget-root');

if (container) {
  createRoot(container).render(
    <QueryProvider>
      <ClientProvider>
        <WidgetApp />
      </ClientProvider>
    </QueryProvider>,
  );
}
