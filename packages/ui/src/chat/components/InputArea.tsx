import type { Provider } from '@opencode-ai/sdk/client';
import { Button } from '@wordpress/components';
import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './InputArea.module.css';
import { ModelSelector, type SelectedModel } from './ModelSelector';

interface InputAreaProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  disabled: boolean;
  isBusy: boolean;
  providers: Provider[];
  selectedModel: SelectedModel | null;
  onSelectModel: (model: SelectedModel) => void;
  placeholder?: string;
  compact?: boolean;
}

export const InputArea = ({
  onSend,
  onAbort,
  disabled,
  isBusy,
  providers,
  selectedModel,
  onSelectModel,
  placeholder,
  compact = false,
}: InputAreaProps) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
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

  const rootClassName = compact
    ? `${styles.root} ${styles.compactRoot}`
    : styles.root;

  return (
    <div className={rootClassName}>
      <div className={styles.container}>
        <div className={compact ? styles.compactInputRow : styles.inputRow}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? __('Type your message...', 'wordforge')}
            rows={1}
            disabled={disabled && !isBusy}
            className={styles.textarea}
          />
          {!compact && (
            <div className={styles.actions}>
              {isBusy ? (
                <Button
                  variant="secondary"
                  onClick={onAbort}
                  icon="controls-pause"
                  className={styles.actionButton}
                >
                  {__('Stop', 'wordforge')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={!text.trim() || disabled}
                  icon="arrow-right-alt"
                  className={styles.actionButton}
                >
                  {__('Send', 'wordforge')}
                </Button>
              )}
            </div>
          )}
        </div>

        {compact ? (
          <div className={styles.compactButtonRow}>
            {isBusy ? (
              <Button
                variant="secondary"
                onClick={onAbort}
                icon="controls-pause"
                className={styles.compactActionButton}
              >
                {__('Stop', 'wordforge')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={!text.trim() || disabled}
                icon="arrow-right-alt"
                className={styles.compactActionButton}
              >
                {__('Send', 'wordforge')}
              </Button>
            )}
            <ModelSelector
              providers={providers}
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              disabled={disabled || isBusy}
            />
          </div>
        ) : (
          <div className={styles.modelRow}>
            <ModelSelector
              providers={providers}
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              disabled={disabled || isBusy}
            />
            {selectedModel && (
              <span className={styles.modelHint}>
                {__('Model will be used for next message', 'wordforge')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
