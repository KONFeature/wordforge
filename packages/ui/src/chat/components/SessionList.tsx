import type { Session, SessionStatus } from '@opencode-ai/sdk/client';
import { Button, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './SessionList.module.css';

interface SessionListProps {
  sessions: Session[];
  statuses: Record<string, SessionStatus>;
  currentSessionId: string | null;
  isLoading: boolean;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  isCreating: boolean;
}

export const SessionList = ({
  sessions,
  statuses,
  currentSessionId,
  isLoading,
  onSelectSession,
  onCreateSession,
  isCreating,
}: SessionListProps) => {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h3 className={styles.title}>{__('Sessions', 'wordforge')}</h3>
        <Button
          icon="plus-alt2"
          label={__('New Session', 'wordforge')}
          onClick={onCreateSession}
          disabled={isCreating}
          isSmall
        />
      </div>

      <div className={styles.list}>
        {isLoading && sessions.length === 0 ? (
          <div className={styles.loadingContainer}>
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{__('No sessions yet', 'wordforge')}</p>
          </div>
        ) : (
          sessions.map((session) => {
            const status = statuses[session.id]?.type || 'idle';
            const isActive = session.id === currentSessionId;
            const date = new Date(session.time.updated * 1000);
            const timeStr = date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <button
                type="button"
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`${styles.sessionItem} ${isActive ? styles.active : ''}`}
              >
                <div className={styles.sessionTitle}>
                  {session.title || __('Untitled Session', 'wordforge')}
                </div>
                <div className={styles.sessionMeta}>
                  <span
                    className={`${styles.statusDot} ${status === 'busy' ? styles.busy : styles.idle}`}
                  />
                  <span>{timeStr}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
