import { Button, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { Session, SessionStatus } from '@opencode-ai/sdk/client';

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
    <div className="wf-chat-sidebar" style={{ width: '280px', minWidth: '280px', borderRight: '1px solid #c3c4c7', display: 'flex', flexDirection: 'column', background: '#f6f7f7' }}>
      <div className="wf-sidebar-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #c3c4c7', background: '#fff' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{__('Sessions', 'wordforge')}</h3>
        <Button
          icon="plus-alt2"
          label={__('New Session', 'wordforge')}
          onClick={onCreateSession}
          disabled={isCreating}
          isSmall
        />
      </div>

      <div className="wf-sessions-list" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {isLoading && sessions.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#646970', fontSize: '13px' }}>
            <p>{__('No sessions yet', 'wordforge')}</p>
          </div>
        ) : (
          sessions.map((session) => {
            const status = statuses[session.id]?.type || 'idle';
            const isActive = session.id === currentSessionId;
            const date = new Date(session.time.updated * 1000);
            const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`wf-session-item ${isActive ? 'is-active' : ''}`}
                style={{
                  padding: '12px',
                  marginBottom: '4px',
                  background: isActive ? '#f0f6fc' : '#fff',
                  border: `1px solid ${isActive ? '#2271b1' : '#dcdcde'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.title || __('Untitled Session', 'wordforge')}
                </div>
                <div style={{ fontSize: '11px', color: '#646970', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: status === 'busy' ? '#dba617' : '#646970',
                    display: 'inline-block'
                  }} />
                  <span>{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
