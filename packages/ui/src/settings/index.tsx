import { createRoot } from '@wordpress/element';
import { SettingsApp } from './SettingsApp';

const rootElement = document.getElementById('wordforge-settings-root');

if (rootElement) {
  createRoot(rootElement).render(<SettingsApp />);
}
