import type { Session } from '@opencode-ai/sdk/client';
import { useMemo } from '@wordpress/element';

export interface SessionWithChildren extends Session {
  children: Session[];
}

export const useSessionHierarchy = (
  sessions: Session[],
): SessionWithChildren[] => {
  return useMemo(() => {
    const childMap = new Map<string, Session[]>();

    for (const session of sessions) {
      if (session.parentID) {
        const existing = childMap.get(session.parentID) || [];
        childMap.set(session.parentID, [...existing, session]);
      }
    }

    const parentSessions: SessionWithChildren[] = [];

    for (const session of sessions) {
      if (!session.parentID) {
        const children = childMap.get(session.id) || [];
        children.sort((a, b) => b.time.updated - a.time.updated);

        parentSessions.push({
          ...session,
          children,
        });
      }
    }

    return parentSessions;
  }, [sessions]);
};

export const findParentSession = (
  sessions: Session[],
  currentSessionId: string | null,
): Session | null => {
  if (!currentSessionId) return null;

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  if (!currentSession?.parentID) return null;

  return sessions.find((s) => s.id === currentSession.parentID) || null;
};

export const isChildSession = (
  sessions: Session[],
  sessionId: string | null,
): boolean => {
  if (!sessionId) return false;
  const session = sessions.find((s) => s.id === sessionId);
  return !!session?.parentID;
};
