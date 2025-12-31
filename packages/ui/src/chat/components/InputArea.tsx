import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState, useRef, useEffect, KeyboardEvent } from '@wordpress/element';

interface InputAreaProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  disabled: boolean;
  isBusy: boolean;
}

export const InputArea = ({ onSend, onAbort, disabled, isBusy }: InputAreaProps) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || disabled || isBusy) return;
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="wf-input-container" style={{ padding: '16px', background: '#fff', borderTop: '1px solid #c3c4c7' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '900px', margin: '0 auto' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={__('Type your message...', 'wordforge')}
          rows={1}
          disabled={disabled && !isBusy} 
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '150px',
            padding: '10px 12px',
            border: '1px solid #8c8f94',
            borderRadius: '4px',
            resize: 'none',
            fontSize: '14px',
            lineHeight: '1.4',
            fontFamily: 'inherit',
            background: (disabled && !isBusy) ? '#f6f7f7' : '#fff',
            cursor: (disabled && !isBusy) ? 'not-allowed' : 'text',
          }}
        />
        <div className="wf-input-actions" style={{ display: 'flex', gap: '8px' }}>
          {isBusy ? (
            <Button 
              variant="secondary" 
              onClick={onAbort} 
              icon="controls-pause"
              style={{ minHeight: '40px' }}
            >
              {__('Stop', 'wordforge')}
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={handleSend} 
              disabled={!text.trim() || disabled}
              icon="arrow-right-alt"
              style={{ minHeight: '40px' }}
            >
              {__('Send', 'wordforge')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
