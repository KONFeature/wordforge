import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef } from '@wordpress/element';
import type { Message, Part, ToolPart, TextPart } from '@opencode-ai/sdk/client';

export interface ChatMessage {
  info: Message;
  parts: Part[];
}

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  isBusy: boolean;
}

const isTextPart = (part: Part): part is TextPart => part.type === 'text';
const isToolPart = (part: Part): part is ToolPart => part.type === 'tool';

const ToolCallItem = ({ part }: { part: ToolPart }) => {
  const [expanded, setExpanded] = useState(false);
  const state = part.state;
  const status = state.status;
  const title = ('title' in state && state.title) || part.tool || 'unknown';

  let statusLabel = __('Pending', 'wordforge');
  if (status === 'running') statusLabel = __('Running', 'wordforge');
  else if (status === 'completed') statusLabel = __('Completed', 'wordforge');
  else if (status === 'error') statusLabel = __('Failed', 'wordforge');

  const statusColor: Record<string, string> = {
    pending: '#646970',
    running: '#856404',
    completed: '#155724',
    error: '#721c24'
  };

  const statusBg: Record<string, string> = {
    pending: '#f0f0f1',
    running: '#fff3cd',
    completed: '#d4edda',
    error: '#f8d7da'
  };

  const input = 'input' in state ? state.input : undefined;
  const output = 'output' in state && state.status === 'completed' ? state.output : undefined;
  const error = 'error' in state && state.status === 'error' ? state.error : undefined;

  return (
    <div style={{ background: '#f6f7f7', border: '1px solid #dcdcde', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #dcdcde', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}
      >
        <span style={{ fontFamily: 'monospace', fontWeight: 500, flex: 1 }}>{title}</span>
        <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 500, background: statusBg[status], color: statusColor[status] }}>
          {statusLabel}
        </span>
        <span style={{ color: '#646970' }}>{expanded ? '-' : '+'}</span>
      </div>
      
      {expanded && (
        <div style={{ padding: '12px', fontSize: '12px' }}>
          {input && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 500, marginBottom: '4px', color: '#646970' }}>Input</div>
              <pre style={{ fontFamily: 'monospace', fontSize: '11px', background: '#fff', padding: '8px', borderRadius: '3px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto' }}>
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 500, marginBottom: '4px', color: '#646970' }}>Output</div>
              <pre style={{ fontFamily: 'monospace', fontSize: '11px', background: '#fff', padding: '8px', borderRadius: '3px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto' }}>
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {error && (
            <div>
              <div style={{ fontWeight: 500, marginBottom: '4px', color: '#646970' }}>Error</div>
              <pre style={{ fontFamily: 'monospace', fontSize: '11px', background: '#fff', padding: '8px', borderRadius: '3px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto', color: '#d63638' }}>
                {error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MessageItem = ({ message }: { message: ChatMessage }) => {
  const isUser = message.info.role === 'user';
  const hasError = message.info.role === 'assistant' && message.info.error != null;
  const time = new Date(message.info.time.created * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const modelInfo = message.info.role === 'assistant' ? {
    provider: message.info.providerID,
    model: message.info.modelID,
  } : null;

  const textParts = message.parts.filter(isTextPart);
  const toolParts = message.parts.filter(isToolPart);

  return (
    <div style={{ 
      marginBottom: '16px', 
      padding: '12px 16px', 
      background: isUser ? '#f0f6fc' : hasError ? '#fcf0f1' : '#fff', 
      borderRadius: '8px', 
      border: `1px solid ${isUser ? '#c5d9ed' : hasError ? '#f0b8b8' : '#dcdcde'}` 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: '#1d2327' }}>
          {isUser ? __('You', 'wordforge') : __('Assistant', 'wordforge')}
        </span>
        <span style={{ color: '#646970' }}>{time}</span>
        {modelInfo && modelInfo.model && (
          <span style={{ 
            padding: '1px 6px', 
            background: '#f0f0f1', 
            borderRadius: '3px', 
            fontSize: '10px',
            color: '#646970',
          }}>
            🤖 {modelInfo.provider}/{modelInfo.model}
          </span>
        )}
      </div>

      {textParts.map((part, i) => (
        <div key={part.id || i} style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: i < textParts.length - 1 ? '8px' : 0 }}>
          {part.text}
        </div>
      ))}

      {hasError && message.info.role === 'assistant' && message.info.error && (
        <div style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#d63638' }}>
          {'data' in message.info.error && message.info.error.data ? 
            (message.info.error.data as { message?: string }).message || __('Error', 'wordforge') : 
            __('Error', 'wordforge')}
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

export const MessageList = ({ messages, isLoading, isThinking }: MessageListProps) => {
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
