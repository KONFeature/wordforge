import type { Session, SessionStatus } from '@opencode-ai/sdk/client';
import { Button, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
  type SessionWithChildren,
  useSessionHierarchy,
} from '../hooks/useSessionHierarchy';
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

interface SessionItemProps {
  session: Session;
  status: SessionStatus | undefined;
  isActive: boolean;
  isChild?: boolean;
  onSelect: () => void;
}

const SessionItem = ({
  session,
  status,
  isActive,
  isChild = false,
  onSelect,
}: SessionItemProps) => {
  const statusType = status?.type || 'idle';
  const date = new Date(session.time.updated * 1000);
  const timeStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const itemClass = [
    styles.sessionItem,
    isActive ? styles.active : '',
    isChild ? styles.childSession : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" onClick={onSelect} className={itemClass}>
      {isChild && <span className={styles.childIndicator}>↳</span>}
      <div className={styles.sessionContent}>
        <div className={styles.sessionTitle}>
          {session.title || __('Untitled Session', 'wordforge')}
        </div>
        <div className={styles.sessionMeta}>
          <span
            className={`${styles.statusDot} ${statusType === 'busy' ? styles.busy : styles.idle}`}
          />
          <span>{timeStr}</span>
        </div>
      </div>
    </button>
  );
};

interface ParentSessionGroupProps {
  session: SessionWithChildren;
  statuses: Record<string, SessionStatus>;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
}

const ParentSessionGroup = ({
  session,
  statuses,
  currentSessionId,
  onSelectSession,
}: ParentSessionGroupProps) => {
  const hasChildren = session.children.length > 0;

  return (
    <div className={styles.sessionGroup}>
      <SessionItem
        session={session}
        status={statuses[session.id]}
        isActive={session.id === currentSessionId}
        onSelect={() => onSelectSession(session.id)}
      />
      {hasChildren && (
        <div className={styles.childrenContainer}>
          {session.children.map((child) => (
            <SessionItem
              key={child.id}
              session={child}
              status={statuses[child.id]}
              isActive={child.id === currentSessionId}
              isChild
              onSelect={() => onSelectSession(child.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SessionList = ({
  sessions,
  statuses,
  currentSessionId,
  isLoading,
  onSelectSession,
  onCreateSession,
  isCreating,
}: SessionListProps) => {
  const hierarchicalSessions = useSessionHierarchy(sessions);

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h3 className={styles.title}>{__('Sessions', 'wordforge')}</h3>
        <Button
          icon="plus-alt2"
          label={__('New Session', 'wordforge')}
          onClick={onCreateSession}
          disabled={isCreating}
          size="small"
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
          hierarchicalSessions.map((session) => (
            <ParentSessionGroup
              key={session.id}
              session={session}
              statuses={statuses}
              currentSessionId={currentSessionId}
              onSelectSession={onSelectSession}
            />
          ))
        )}
      </div>
    </div>
  );
};
