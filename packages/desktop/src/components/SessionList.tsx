import type { Session } from '@opencode-ai/sdk/v2/client';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SessionWithChildren } from '../hooks/useSessions';

interface SessionListProps {
  sessions: SessionWithChildren[];
  isLoading: boolean;
  isServerRunning: boolean;
  onOpenSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isCreating: boolean;
  isDeleting: boolean;
}

const INITIAL_VISIBLE_COUNT = 5;

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

interface SessionItemProps {
  session: Session;
  isChild?: boolean;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function SessionItem({
  session,
  isChild = false,
  onOpen,
  onDelete,
  isDeleting,
}: SessionItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showConfirm) {
      onDelete();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div className={`session-item ${isChild ? 'session-item-child' : ''}`}>
      {isChild && <span className="session-child-indicator">↳</span>}
      <button type="button" className="session-content-btn" onClick={onOpen}>
        <span className="session-title">
          {session.title || 'Untitled Session'}
        </span>
        <span className="session-time">
          {formatTimeAgo(session.time.updated)}
        </span>
      </button>
      <button
        type="button"
        className={`btn-delete-session ${showConfirm ? 'confirm' : ''}`}
        onClick={handleDelete}
        disabled={isDeleting}
        title={showConfirm ? 'Click again to confirm' : 'Delete session'}
      >
        {isDeleting ? <div className="spinner-tiny" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}

interface SessionGroupProps {
  session: SessionWithChildren;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isDeleting: boolean;
}

function SessionGroup({
  session,
  onOpenSession,
  onDeleteSession,
  isDeleting,
}: SessionGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = session.children.length > 0;

  return (
    <div className="session-group">
      <div className="session-group-header">
        {hasChildren && (
          <button
            type="button"
            className="btn-expand-session"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        <SessionItem
          session={session}
          onOpen={() => onOpenSession(session.id)}
          onDelete={() => onDeleteSession(session.id)}
          isDeleting={isDeleting}
        />
      </div>
      {hasChildren && expanded && (
        <div className="session-children">
          {session.children.map((child) => (
            <SessionItem
              key={child.id}
              session={child}
              isChild
              onOpen={() => onOpenSession(child.id)}
              onDelete={() => onDeleteSession(child.id)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionList({
  sessions,
  isLoading,
  isServerRunning,
  onOpenSession,
  onCreateSession,
  onDeleteSession,
  isCreating,
  isDeleting,
}: SessionListProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleSessions = showAll
    ? sessions
    : sessions.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = sessions.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className="sessions-section">
      <div className="sessions-header">
        <h3>Sessions</h3>
        {isServerRunning && (
          <button
            type="button"
            className="btn-new-session"
            onClick={onCreateSession}
            disabled={isCreating}
          >
            {isCreating ? (
              <div className="spinner-small" />
            ) : (
              <Plus size={16} />
            )}
            <span>New Session</span>
          </button>
        )}
      </div>

      <div className="sessions-list">
        {!isServerRunning ? (
          <div className="sessions-empty">
            <span className="sessions-empty-text">
              Start the server to manage sessions
            </span>
          </div>
        ) : isLoading && sessions.length === 0 ? (
          <div className="sessions-loading">
            <div className="spinner-small" />
            <span>Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="sessions-empty">
            <span className="sessions-empty-text">No sessions yet</span>
            <span className="sessions-empty-hint">
              Create a new session to get started
            </span>
          </div>
        ) : (
          <>
            {visibleSessions.map((session) => (
              <SessionGroup
                key={session.id}
                session={session}
                onOpenSession={onOpenSession}
                onDeleteSession={onDeleteSession}
                isDeleting={isDeleting}
              />
            ))}
            {!showAll && hiddenCount > 0 && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => setShowAll(true)}
              >
                Show {hiddenCount} more session{hiddenCount > 1 ? 's' : ''}
              </button>
            )}
            {showAll && hiddenCount > 0 && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => setShowAll(false)}
              >
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
