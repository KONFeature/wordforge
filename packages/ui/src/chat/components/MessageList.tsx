import { Button, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef } from '@wordpress/element';
import { Message, MessagePart } from '../../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isThinking: boolean;
  isBusy: boolean;
}

const ToolCallItem = ({ part }: { part: MessagePart }) => {
  const [expanded, setExpanded] = useState(false);
  const state = part.state || {};
  const status = state.status || 'pending';
  const title = state.title || part.tool || 'unknown';

  let statusLabel = __('Pending', 'wordforge');
  if (status === 'running') statusLabel = __('Running', 'wordforge');
  else if (status === 'completed') statusLabel = __('Completed', 'wordforge');
  else if (status === 'error') statusLabel = __('Failed', 'wordforge');

  const statusColor = {
    pending: '#646970',
    running: '#856404',
    completed: '#155724',
    error: '#721c24'
  }[status];

  const statusBg = {
    pending: '#f0f0f1',
    running: '#fff3cd',
    completed: '#d4edda',
    error: '#f8d7da'
  }[status];

  return (
    <div style={{ background: '#f6f7f7', border: '1px solid #dcdcde', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #dcdcde', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}
      >
        <span style={{ fontFamily: 'monospace', fontWeight: 500, flex: 1 }}>{title}</span>
        <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 500, background: statusBg, color: statusColor }}>
          {statusLabel}
        </span>
        <span style={{ color: '#646970' }}>{expanded ? '-' : '+'}</span>
      </div>
      
      {expanded && (
        <div style={{ padding: '12px', fontSize: '12px' }}>
          {state.input && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 500, marginBottom: '4px', color: '#646970' }}>Input</div>
              <pre style={{ fontFamily: 'monospace', fontSize: '11px', background: '#fff', padding: '8px', borderRadius: '3px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto' }}>
                {JSON.stringify(state.input, null, 2)}
              </pre>
            </div>
          )}
          {state.output && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 500, marginBottom: '4px', color: '#646970' }}>Output</div>
              <pre style={{ fontFamily: 'monospace', fontSize: '11px', background: '#fff', padding: '8px', borderRadius: '3px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto' }}>
                {typeof state.output === 'string' ? state.output : JSON.stringify(state.output, null, 2)}
              </pre>
            </div>
          )}
          {state.error && (
            <div>
              <div style={{ fontWeight: 500, marginBottom: '4px', color: '#646970' }}>Error</div>
              <pre style={{ fontFamily: 'monospace', fontSize: '11px', background: '#fff', padding: '8px', borderRadius: '3px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto', color: '#d63638' }}>
                {state.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MessageItem = ({ message }: { message: Message }) => {
  const isUser = message.info.role === 'user';
  const isError = message.info.error != null;
  const time = new Date(message.info.time.created * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const textParts = message.parts.filter(p => p.type === 'text');
  const toolParts = message.parts.filter(p => p.type === 'tool');

  return (
    <div style={{ 
      marginBottom: '16px', 
      padding: '12px 16px', 
      background: isUser ? '#f0f6fc' : isError ? '#fcf0f1' : '#fff', 
      borderRadius: '8px', 
      border: `1px solid ${isUser ? '#c5d9ed' : isError ? '#f0b8b8' : '#dcdcde'}` 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
        <span style={{ fontWeight: 600, color: '#1d2327' }}>
          {isUser ? __('You', 'wordforge') : __('Assistant', 'wordforge')}
        </span>
        <span style={{ color: '#646970' }}>{time}</span>
      </div>

      {textParts.map((part, i) => (
        <div key={i} style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: i < textParts.length - 1 ? '8px' : 0 }}>
          {part.text}
        </div>
      ))}

      {isError && message.info.error && (
        <div style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#d63638' }}>
          {message.info.error.data?.message || message.info.error.message || __('Error', 'wordforge')}
        </div>
      )}

      {toolParts.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {toolParts.map((part) => (
            <ToolCallItem key={part.id} part={part} />
          ))}
        </div>
      )}
    </div>
  );
};

export const MessageList = ({ messages, isLoading, isThinking, isBusy }: MessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  if (isLoading && messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f9f9f9' }}>
        <Spinner />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f9f9f9', padding: '20px', textAlign: 'center', color: '#646970' }}>
        <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '12px' }} className="dashicons dashicons-format-chat"></div>
        <p style={{ fontSize: '14px' }}>{__('Select a session to view messages, or create a new one.', 'wordforge')}</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f9f9f9' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {messages.map((msg) => (
          <MessageItem key={msg.info.id} message={msg} />
        ))}
        
        {isThinking && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px 16px', 
            background: '#fff', 
            borderRadius: '8px', 
            border: '1px dashed #dcdcde' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ fontWeight: 600, color: '#1d2327' }}>{__('Assistant', 'wordforge')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#646970' }}>
              <Spinner />
              <span>{__('Thinking...', 'wordforge')}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
