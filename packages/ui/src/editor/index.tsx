import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
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
          <EditorSidebar context={context} />
        </QueryProvider>
      </PluginSidebar>
    </>
  );
};

registerPlugin('wordforge', {
  render: () => (
    <QueryProvider>
      <WordForgeSidebarPlugin />
    </QueryProvider>
  ),
  icon: SIDEBAR_ICON,
});
