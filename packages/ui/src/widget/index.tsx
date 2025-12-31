import { createRoot } from '@wordpress/element';
import { ChatWidget } from '../chat/components/ChatWidget';
import type { ScopedContext } from '../chat/hooks/useContextInjection';
import { useOpencodeClient } from '../chat/useOpencodeClient';
import { QueryProvider } from '../lib/QueryProvider';
import '../styles/variables.css';

interface WidgetConfig {
  proxyUrl: string;
  nonce: string;
  context?: ScopedContext | null;
  serverStatus?: {
    running: boolean;
  };
}

declare global {
  interface Window {
    wordforgeWidget?: WidgetConfig;
  }
}

const WidgetApp = () => {
  const config = window.wordforgeWidget;

  if (!config) {
    return null;
  }

  const client = useOpencodeClient(config);

  return (
    <ChatWidget
      client={client}
      context={config.context}
      isReady={config.serverStatus?.running ?? false}
    />
  );
};

const container = document.getElementById('wordforge-widget-root');

if (container) {
  createRoot(container).render(
    <QueryProvider>
      <WidgetApp />
    </QueryProvider>,
  );
}
