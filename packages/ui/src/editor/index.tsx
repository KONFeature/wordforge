import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { ClientProvider } from '../lib/ClientProvider';
import { QueryProvider } from '../lib/QueryProvider';
import '../styles/variables.css';
import { EditorSidebar } from './components/EditorSidebar';
import { useEditorContext } from './hooks/useEditorContext';

const SIDEBAR_NAME = 'wordforge-ai';
const SIDEBAR_ICON = 'superhero-alt';

const WordForgeSidebarPlugin = () => {
  const { context } = useEditorContext();

  return (
    <>
      <PluginSidebarMoreMenuItem target={SIDEBAR_NAME} icon={SIDEBAR_ICON}>
        {__('WordForge AI', 'wordforge')}
      </PluginSidebarMoreMenuItem>

      <PluginSidebar
        name={SIDEBAR_NAME}
        title={__('WordForge AI', 'wordforge')}
        icon={SIDEBAR_ICON}
      >
        <QueryProvider>
          <ClientProvider>
            <EditorSidebar context={context} />
          </ClientProvider>
        </QueryProvider>
      </PluginSidebar>
    </>
  );
};

registerPlugin('wordforge', {
  render: () => (
    <QueryProvider>
      <ClientProvider>
        <WordForgeSidebarPlugin />
      </ClientProvider>
    </QueryProvider>
  ),
  icon: SIDEBAR_ICON,
});
