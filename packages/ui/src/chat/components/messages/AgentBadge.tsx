import styles from '../MessageList.module.css';
import type { AgentPart } from './types';

interface AgentBadgeProps {
  part: AgentPart;
}

export const AgentBadge = ({ part }: AgentBadgeProps) => {
  if (!part.name) return null;

  return (
    <div className={styles.agentBadge}>
      <span className={styles.agentBadgeIcon}>🤖</span>
      <span className={styles.agentBadgeName}>{part.name}</span>
    </div>
  );
};
