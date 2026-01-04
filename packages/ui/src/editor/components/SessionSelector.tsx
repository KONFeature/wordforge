import type { Session, SessionStatus } from '@opencode-ai/sdk/v2';
import { Button, Spinner } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
  type SessionWithChildren,
  useSessionHierarchy,
} from '../../chat/hooks/useSessionHierarchy';
import styles from './SessionSelector.module.css';

interface SessionSelectorProps {
  sessions: Session[];
  statuses: Record<string, SessionStatus>;
  currentSessionId: string | null;
  currentSessionTitle: string;
  isLoading: boolean;
  isBusy: boolean;
  onSelectSession: (id: string | null) => void;
  onRefresh: () => void;
}

interface SessionItemProps {
  session: Session;
  status: SessionStatus | undefined;
  isActive: boolean;
  isChild?: boolean;
  onSelect: () => void;
}

const SessionListItem = ({
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
    isChild ? styles.child : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" onClick={onSelect} className={itemClass}>
      {isChild && <span className={styles.childIndicator}>↳</span>}
      <div className={styles.sessionItemContent}>
        <div className={styles.sessionItemTitle}>
          {session.title || __('Untitled Session', 'wordforge')}
        </div>
        <div className={styles.sessionItemMeta}>
          <span
            className={`${styles.statusDot} ${statusType === 'busy' ? styles.busy : styles.idle}`}
          />
          <span>{timeStr}</span>
        </div>
      </div>
    </button>
  );
};

interface SessionGroupProps {
  session: SessionWithChildren;
  statuses: Record<string, SessionStatus>;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
}

const SessionGroup = ({
  session,
  statuses,
  currentSessionId,
  onSelectSession,
}: SessionGroupProps) => {
  return (
    <>
      <SessionListItem
        session={session}
        status={statuses[session.id]}
        isActive={session.id === currentSessionId}
        onSelect={() => onSelectSession(session.id)}
      />
      {session.children.map((child) => (
        <SessionListItem
          key={child.id}
          session={child}
          status={statuses[child.id]}
          isActive={child.id === currentSessionId}
          isChild
          onSelect={() => onSelectSession(child.id)}
        />
      ))}
    </>
  );
};

export const SessionSelector = ({
  sessions,
  statuses,
  currentSessionId,
  currentSessionTitle,
  isLoading,
  isBusy,
  onSelectSession,
  onRefresh,
}: SessionSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hierarchicalSessions = useSessionHierarchy(sessions);

  const currentStatus = currentSessionId
    ? statuses[currentSessionId]?.type || 'idle'
    : 'idle';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.sessionInfo}>
          <div className={styles.sessionTitle}>{currentSessionTitle}</div>
          <div className={styles.sessionMeta}>
            <span
              className={`${styles.statusDot} ${currentStatus === 'busy' ? styles.busy : styles.idle}`}
            />
            <span>
              {currentStatus === 'busy'
                ? __('Working...', 'wordforge')
                : __('Ready', 'wordforge')}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            icon="plus-alt2"
            label={__('New Chat', 'wordforge')}
            onClick={() => {
              onSelectSession(null);
              setIsExpanded(false);
            }}
            disabled={isBusy}
            size="small"
          />
          <Button
            icon="update"
            label={__('Refresh', 'wordforge')}
            onClick={onRefresh}
            disabled={isBusy}
            size="small"
          />
          <Button
            className={styles.toggleButton}
            label={
              isExpanded
                ? __('Hide sessions', 'wordforge')
                : __('Show all sessions', 'wordforge')
            }
            onClick={() => setIsExpanded(!isExpanded)}
            size="small"
          >
            <span
              className={`${styles.toggleIcon} ${isExpanded ? styles.expanded : ''}`}
            >
              ▼
            </span>
          </Button>
        </div>
      </div>

      <div
        className={`${styles.sessionList} ${isExpanded ? styles.expanded : ''}`}
      >
        <div className={styles.sessionListInner}>
          {isLoading && sessions.length === 0 ? (
            <div className={styles.loadingContainer}>
              <Spinner />
            </div>
          ) : sessions.length === 0 ? (
            <div className={styles.emptyState}>
              {__('No previous sessions', 'wordforge')}
            </div>
          ) : (
            hierarchicalSessions.map((session) => (
              <SessionGroup
                key={session.id}
                session={session}
                statuses={statuses}
                currentSessionId={currentSessionId}
                onSelectSession={(id) => {
                  onSelectSession(id);
                  setIsExpanded(false);
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
