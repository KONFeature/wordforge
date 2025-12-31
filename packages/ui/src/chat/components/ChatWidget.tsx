import type { OpencodeClient } from '@opencode-ai/sdk/client';
import { Button, Spinner } from '@wordpress/components';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { ScopedContext } from '../hooks/useContextInjection';
import { CompactChat } from './CompactChat';
import styles from './ChatWidget.module.css';

const STORAGE_KEY = 'wordforge_widget_open';

interface ChatWidgetProps {
  client: OpencodeClient | null;
  context?: ScopedContext | null;
  isReady?: boolean;
}

export const ChatWidget = ({
  client,
  context,
  isReady = true,
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    } catch {}
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (isOpen && !isMinimized) {
      setIsMinimized(true);
    } else if (isOpen && isMinimized) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen, isMinimized]);

  const handleExpand = useCallback(() => {
    setIsMinimized(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
          setIsMinimized(false);
        } else {
          setIsOpen(true);
          setIsMinimized(false);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsMinimized(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <div className={styles.floatingButton}>
        <Button
          className={styles.toggleButton}
          onClick={handleToggle}
          label={__('Open WordForge Chat (Ctrl+K)', 'wordforge')}
        >
          <span className={styles.buttonIcon}>⚒️</span>
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className={styles.minimizedWidget}>
        <button
          type="button"
          className={styles.minimizedBar}
          onClick={handleExpand}
        >
          <span className={styles.minimizedIcon}>⚒️</span>
          <span className={styles.minimizedLabel}>
            {__('WordForge Chat', 'wordforge')}
          </span>
        </button>
        <Button
          icon="no-alt"
          className={styles.closeMinimized}
          onClick={() => {
            setIsOpen(false);
            setIsMinimized(false);
          }}
          label={__('Close', 'wordforge')}
          isSmall
        />
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetTitle}>
          <span className={styles.widgetIcon}>⚒️</span>
          <span>{__('WordForge', 'wordforge')}</span>
        </div>
        <div className={styles.widgetActions}>
          <Button
            icon="minus"
            label={__('Minimize', 'wordforge')}
            onClick={() => setIsMinimized(true)}
            isSmall
          />
          <Button
            icon="no-alt"
            label={__('Close', 'wordforge')}
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
            isSmall
          />
        </div>
      </div>

      <div className={styles.widgetBody}>
        {!isReady ? (
          <div className={styles.notReady}>
            <Spinner />
            <p>{__('Connecting to OpenCode...', 'wordforge')}</p>
          </div>
        ) : !client ? (
          <div className={styles.notReady}>
            <p>
              {__(
                'OpenCode is not available. Please check settings.',
                'wordforge',
              )}
            </p>
          </div>
        ) : (
          <CompactChat client={client} context={context} />
        )}
      </div>
    </div>
  );
};
