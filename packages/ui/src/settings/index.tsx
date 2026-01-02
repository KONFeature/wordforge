import { createRoot } from '@wordpress/element';
import '../styles/variables.css';
import { ClientProvider } from '../lib/ClientProvider';
import { QueryProvider } from '../lib/QueryProvider';
import { SettingsApp } from './SettingsApp';

const rootElement = document.getElementById('wordforge-settings-root');

if (rootElement) {
  createRoot(rootElement).render(
    <QueryProvider>
      <ClientProvider>
        <SettingsApp />
      </ClientProvider>
    </QueryProvider>,
  );
}
