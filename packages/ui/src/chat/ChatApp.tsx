import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { Notice, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ChatApiClient } from './api';
import { SessionList } from './components/SessionList';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { DeleteSessionModal } from './components/DeleteSessionModal';
import { Session, Message, SessionStatus, MessageInfo, MessagePart } from '../types';

export const ChatApp = () => {
  const [config] = useState(() => window.wordforgeChat);
  const [api] = useState(() => config ? new ChatApiClient(config) : null);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SessionStatus>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSession = useMemo(() => sessions.find(s => s.id === currentSessionId), [sessions, currentSessionId]);
  const currentStatus = currentSessionId ? statuses[currentSessionId]?.type || 'idle' : 'idle';
  const isBusy = currentStatus === 'busy' || currentStatus === 'retry';

  useEffect(() => {
    if (!api) return;

    const loadData = async () => {
      setIsLoadingSessions(true);
      try {
        const [loadedSessions, loadedStatuses] = await Promise.all([
          api.request<Session[]>('session'),
          api.request<Record<string, SessionStatus>>('session/status')
        ]);
        
        loadedSessions.sort((a, b) => b.time.updated - a.time.updated);
        
        setSessions(loadedSessions);
        setStatuses(loadedStatuses || {});
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setError(__('Failed to load sessions', 'wordforge'));
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadData();
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const connectSSE = () => {
      const source = api.getEventSource();

      source.onopen = () => {
        console.log('[WordForge Chat] Event stream connected');
      };

      source.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleEvent(event);
        } catch (err) {
          console.error('[WordForge Chat] Failed to parse event:', err);
        }
      };

      source.onerror = (e) => {
        console.error('[WordForge Chat] Event stream error:', e);
        source.close();
        setTimeout(connectSSE, 5000);
      };

      return source;
    };

    const source = connectSSE();
    return () => source.close();
  }, [api]);

  const handleEvent = useCallback((event: any) => {
    const { type, properties } = event;

    switch (type) {
      case 'session.created':
        setSessions(prev => {
          if (prev.some(s => s.id === properties.info.id)) return prev;
          return [properties.info, ...prev];
        });
        break;
      case 'session.updated':
        setSessions(prev => prev.map(s => s.id === properties.info.id ? properties.info : s));
        break;
      case 'session.deleted':
        setSessions(prev => prev.filter(s => s.id !== properties.info.id));
        if (currentSessionId === properties.info.id) {
          setCurrentSessionId(null);
          setMessages([]);
        }
        break;
      case 'session.status':
        setStatuses(prev => ({
          ...prev,
          [properties.sessionID]: properties.status
        }));
        break;
      case 'message.updated':
        if (properties.info.sessionID === currentSessionId) {
             setMessages(prev => {
                const index = prev.findIndex(m => m.info.id === properties.info.id);
                if (index === -1) {
                    return prev;
                } else {
                    const newMessages = [...prev];
                    newMessages[index] = { ...newMessages[index], info: properties.info };
                    return newMessages;
                }
             });
        }
        break;
      case 'message.part.updated':
         if (properties.part.sessionID === currentSessionId) {
             setMessages(prev => {
                 const msgIndex = prev.findIndex(m => m.info.id === properties.part.messageID);
                 if (msgIndex === -1) {
                     return prev;
                 }
                 
                 const newMessages = [...prev];
                 const msg = { ...newMessages[msgIndex], parts: [...newMessages[msgIndex].parts] };
                 const partIndex = msg.parts.findIndex(p => p.id === properties.part.id);
                 
                 if (partIndex === -1) {
                     msg.parts.push(properties.part);
                 } else {
                     msg.parts[partIndex] = properties.part;
                 }
                 
                 newMessages[msgIndex] = msg;
                 return newMessages;
             });
         }
         break;
    }
  }, [currentSessionId]);

  const selectSession = async (id: string) => {
    setCurrentSessionId(id);
    setIsLoadingMessages(true);
    setMessages([]);
    setError(null);
    
    if (!api) return;

    try {
      const msgs = await api.request<Message[]>(`session/${id}/message?limit=10`);
      setMessages(msgs || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(__('Failed to load messages', 'wordforge'));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createSession = async () => {
    if (!api) return;
    setIsCreatingSession(true);
    try {
      const session = await api.request<Session>('session', {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSessions(prev => [session, ...prev]);
      selectSession(session.id);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(__('Failed to create session', 'wordforge'));
    } finally {
      setIsCreatingSession(false);
    }
  };

  const deleteSession = async () => {
    if (!api || !currentSessionId) return;
    setIsDeletingSession(true);
    try {
      await api.request(`session/${currentSessionId}`, { method: 'DELETE' });
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
    if (!api || !currentSessionId) return;

    const tempUserMsg: Message = {
      info: {
        id: 'temp-user-' + Date.now(),
        role: 'user',
        time: { created: Date.now() / 1000 },
        sessionID: currentSessionId
      },
      parts: [{ id: 'temp-part-' + Date.now(), type: 'text', text, messageID: 'temp', sessionID: currentSessionId }]
    };
    
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      await api.request(`session/${currentSessionId}/prompt_async`, {
        method: 'POST',
        body: JSON.stringify({
          parts: [{ type: 'text', text }]
        })
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(__('Failed to send message', 'wordforge'));
    }
  };

  const abortSession = async () => {
    if (!api || !currentSessionId) return;
    try {
      await api.request(`session/${currentSessionId}/abort`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to abort session:', err);
    }
  };

  if (!config) {
    return <div style={{ padding: '20px', color: '#d63638' }}>WordForge Configuration Missing</div>;
  }

  return (
    <div className="wf-chat-container" style={{ display: 'flex', height: 'calc(100vh - 120px)', minHeight: '500px', background: '#fff', border: '1px solid #c3c4c7', borderRadius: '4px', overflow: 'hidden' }}>
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
  );
};
