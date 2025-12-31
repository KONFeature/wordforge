import { useState, useEffect, useMemo } from '@wordpress/element';
import { Notice, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { Session, SessionStatus, Message, Part, Provider, McpStatus } from '@opencode-ai/sdk/client';
import { useOpencodeClient } from './useOpencodeClient';
import { SessionList } from './components/SessionList';
import { MessageList, type ChatMessage } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { DeleteSessionModal } from './components/DeleteSessionModal';
import { ConfigPanel } from './components/ConfigPanel';
import type { SelectedModel } from './components/ModelSelector';

export const ChatApp = () => {
  const config = window.wordforgeChat;
  const client = config ? useOpencodeClient(config) : null;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SessionStatus>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [mcpStatus, setMcpStatus] = useState<Record<string, McpStatus>>({});
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSession = useMemo(
    () => sessions.find(s => s.id === currentSessionId), 
    [sessions, currentSessionId]
  );
  const currentStatus = currentSessionId ? statuses[currentSessionId]?.type || 'idle' : 'idle';
  const isBusy = currentStatus === 'busy' || currentStatus === 'retry' || isSending;

  useEffect(() => {
    if (!client) return;

    const loadData = async () => {
      setIsLoadingSessions(true);
      setIsLoadingConfig(true);
      
      try {
        const [sessionsResult, statusesResult] = await Promise.all([
          client.session.list(),
          client.session.status(),
        ]);
        
        const loadedSessions = Array.isArray(sessionsResult.data) ? sessionsResult.data : [];
        loadedSessions.sort((a, b) => b.time.updated - a.time.updated);
        
        setSessions(loadedSessions);
        setStatuses(statusesResult.data && typeof statusesResult.data === 'object' ? statusesResult.data : {});
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setError(__('Failed to load sessions', 'wordforge'));
      } finally {
        setIsLoadingSessions(false);
      }
      
      try {
        const [configProvidersResult, mcpResult] = await Promise.all([
          client.config.providers(),
          client.mcp.status(),
        ]);
        
        const configData = configProvidersResult.data;
        const loadedProviders = configData && Array.isArray(configData.providers) ? configData.providers : [];
        const defaultModels = configData && configData.default ? configData.default : {};
        
        setProviders(loadedProviders);
        setMcpStatus(mcpResult.data && typeof mcpResult.data === 'object' ? mcpResult.data : {});
        
        const defaultModelKey = Object.keys(defaultModels)[0];
        if (defaultModelKey && defaultModels[defaultModelKey]) {
          const [providerID, modelID] = defaultModels[defaultModelKey].split('/');
          if (providerID && modelID) {
            setSelectedModel({ providerID, modelID });
          }
        } else if (loadedProviders.length > 0) {
          const firstProvider = loadedProviders[0];
          const firstModelId = Object.keys(firstProvider.models || {})[0];
          if (firstModelId) {
            setSelectedModel({ providerID: firstProvider.id, modelID: firstModelId });
          }
        }
      } catch (err) {
        console.error('Failed to load config (non-critical):', err);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadData();
  }, [client]);

  const selectSession = async (id: string) => {
    if (!client) return;
    
    setCurrentSessionId(id);
    setIsLoadingMessages(true);
    setMessages([]);
    setError(null);

    try {
      const result = await client.session.messages({ path: { id } });
      setMessages(result.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(__('Failed to load messages', 'wordforge'));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createSession = async () => {
    if (!client) return;
    
    setIsCreatingSession(true);
    try {
      const result = await client.session.create({ body: {} });
      if (result.data) {
        setSessions(prev => [result.data!, ...prev]);
        selectSession(result.data.id);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(__('Failed to create session', 'wordforge'));
    } finally {
      setIsCreatingSession(false);
    }
  };

  const deleteSession = async () => {
    if (!client || !currentSessionId) return;
    
    setIsDeletingSession(true);
    try {
      await client.session.delete({ path: { id: currentSessionId } });
      setSessions(prev => prev.filter(s => s.id !== currentSessionId));
      setCurrentSessionId(null);
      setMessages([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError(__('Failed to delete session', 'wordforge'));
    } finally {
      setIsDeletingSession(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!client || !currentSessionId) return;

    const tempUserMsg: ChatMessage = {
      info: {
        id: 'temp-user-' + Date.now(),
        sessionID: currentSessionId,
        role: 'user',
        time: { created: Date.now() / 1000 },
        agent: 'build',
        model: { providerID: '', modelID: '' },
      },
      parts: [{
        id: 'temp-part-' + Date.now(),
        type: 'text',
        text,
        messageID: 'temp',
        sessionID: currentSessionId,
      }]
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setIsSending(true);

    try {
      const promptBody: { parts: Array<{ type: 'text'; text: string }>; model?: { providerID: string; modelID: string } } = {
        parts: [{ type: 'text', text }],
      };
      
      if (selectedModel) {
        promptBody.model = selectedModel;
      }

      await client.session.prompt({
        path: { id: currentSessionId },
        body: promptBody,
      });

      const messagesResult = await client.session.messages({ path: { id: currentSessionId } });
      if (messagesResult.data) {
        setMessages(messagesResult.data);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(__('Failed to send message', 'wordforge'));
    } finally {
      setIsSending(false);
    }
  };

  const abortSession = async () => {
    if (!client || !currentSessionId) return;
    try {
      await client.session.abort({ path: { id: currentSessionId } });
    } catch (err) {
      console.error('Failed to abort session:', err);
    }
  };

  if (!config) {
    return <div style={{ padding: '20px', color: '#d63638' }}>WordForge Configuration Missing</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      <div className="wf-chat-container" style={{ display: 'flex', flex: 1, background: '#fff', border: '1px solid #c3c4c7', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
        <SessionList
          sessions={sessions}
          statuses={statuses}
          currentSessionId={currentSessionId}
          isLoading={isLoadingSessions}
          onSelectSession={selectSession}
          onCreateSession={createSession}
          isCreating={isCreatingSession}
        />
        
        <div className="wf-chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="wf-chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #c3c4c7', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentSession?.title || __('Select a session', 'wordforge')}
              </span>
              {currentSessionId && (
                <span style={{ 
                  fontSize: '11px', 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  background: isBusy ? '#fff3cd' : '#d4edda', 
                  color: isBusy ? '#856404' : '#155724' 
                }}>
                  {isBusy ? __('Busy', 'wordforge') : __('Ready', 'wordforge')}
                </span>
              )}
            </div>
            <div className="wf-chat-actions">
              <Button
                icon="trash"
                label={__('Delete Session', 'wordforge')}
                onClick={() => setShowDeleteModal(true)}
                disabled={!currentSessionId}
                isSmall
                isDestructive
              />
            </div>
          </div>

          <MessageList
            messages={messages}
            isLoading={isLoadingMessages}
            isThinking={isBusy}
            isBusy={isBusy}
          />

          {error && (
            <div style={{ padding: '0 16px' }}>
              <Notice status="error" onRemove={() => setError(null)} isDismissible>
                {error}
              </Notice>
            </div>
          )}

          <InputArea
            onSend={sendMessage}
            onAbort={abortSession}
            disabled={!currentSessionId}
            isBusy={isBusy}
            providers={providers}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
          />
        </div>

        <DeleteSessionModal
          sessionName={currentSession?.title || __('Untitled Session', 'wordforge')}
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteSession}
          isDeleting={isDeletingSession}
        />
      </div>
      
      <ConfigPanel
        providers={providers}
        mcpStatus={mcpStatus}
        isLoading={isLoadingConfig}
      />
    </div>
  );
};
