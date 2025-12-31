import { createRoot } from '@wordpress/element';
import { ChatApp } from './ChatApp';

const container = document.getElementById('wordforge-chat-root');

if (container) {
  createRoot(container).render(<ChatApp />);
}
