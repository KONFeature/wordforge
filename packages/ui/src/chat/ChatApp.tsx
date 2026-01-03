import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './ChatApp.module.css';
import { ChatHeader } from './components/ChatHeader';
import { ChatInterface } from './components/ChatInterface';
import { ConfigPanel } from './components/ConfigPanel';
import { DeleteSessionModal } from './components/DeleteSessionModal';
import { SessionList } from './components/SessionList';
import { useChat } from './hooks/useChat';
import { useMcpStatus } from './hooks/useConfig';
import { useExport } from './hooks/useExport';
import { useMessageSearch } from './hooks/useMessageSearch';

const MOBILE_BREAKPOINT = 768;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

export const ChatApp = () => {
  const chat = useChat();
  const { data: mcpStatus = {} } = useMcpStatus();
  const isMobile = useIsMobile();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const search = useMessageSearch(chat.messages);
  const { exportConversation } = useExport(chat.session, chat.messages);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleSelectSession = useCallback(
    (id: string | null) => {
      chat.selectSession(id);
      if (isMobile) closeSidebar();
    },
    [chat.selectSession, isMobile, closeSidebar],
  );

  const handleDeleteSession = async () => {
    await chat.deleteSession();
    setShowDeleteModal(false);
  };

  useEffect(() => {
    if (!isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        closeSidebar();
      }
    };

    if (sidebarOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [sidebarOpen, closeSidebar]);

  const sidebarClassName = `${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`;

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        {isMobile && (
          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={() => setSidebarOpen(true)}
            aria-label={__('Open sessions menu', 'wordforge')}
            aria-expanded={sidebarOpen}
            aria-controls="session-sidebar"
          >
            <span aria-hidden="true">☰</span>
          </button>
        )}

        {isMobile && (
          <div
            className={`${styles.overlay} ${sidebarOpen ? styles.visible : ''}`}
            onClick={closeSidebar}
            onKeyDown={(e) => e.key === 'Enter' && closeSidebar()}
            role="button"
            tabIndex={sidebarOpen ? 0 : -1}
            aria-label={__('Close sessions menu', 'wordforge')}
          />
        )}

        <nav
          id="session-sidebar"
          className={sidebarClassName}
          aria-label={__('Chat sessions', 'wordforge')}
        >
          <SessionList
            sessions={chat.sessions}
            statuses={chat.statuses}
            currentSessionId={chat.sessionId}
            isLoading={chat.isLoadingSessions}
            onSelectSession={handleSelectSession}
            onCreateSession={() => handleSelectSession(null)}
            isCreating={chat.isSending}
          />
        </nav>

        <main
          className={styles.main}
          aria-label={__('Chat content', 'wordforge')}
        >
          <ChatHeader
            title={chat.session?.title || __('Select a session', 'wordforge')}
            isBusy={chat.isBusy}
            hasSession={!!chat.sessionId}
            hasMessages={chat.messages.length > 0}
            messages={chat.messages}
            providers={chat.providers}
            parentSession={
              chat.parentSession
                ? { id: chat.parentSession.id, title: chat.parentSession.title }
                : null
            }
            onRefresh={chat.refresh}
            onDelete={() => setShowDeleteModal(true)}
            onBackToParent={
              chat.parentSession
                ? () => chat.selectSession(chat.parentSession!.id)
                : undefined
            }
            onToggleSearch={() => setShowSearch(!showSearch)}
            onExport={exportConversation}
            showSearch={showSearch}
          />

          <ChatInterface
            chat={chat}
            showSearch={showSearch}
            searchQuery={search.searchQuery}
            onSearchChange={search.setSearchQuery}
            onClearSearch={search.clearSearch}
            searchMatchCount={search.matchCount}
            isSearching={search.isSearching}
            filteredMessages={search.filteredMessages}
          />
        </main>

        <DeleteSessionModal
          sessionName={
            chat.session?.title || __('Untitled Session', 'wordforge')
          }
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSession}
          isDeleting={chat.isDeleting}
        />
      </div>

      <ConfigPanel
        providers={chat.providers}
        mcpStatus={mcpStatus}
        isLoading={false}
      />
    </div>
  );
};
