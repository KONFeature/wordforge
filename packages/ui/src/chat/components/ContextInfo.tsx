import type { AssistantMessage, Provider } from '@opencode-ai/sdk/client';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './ContextInfo.module.css';
import type { ChatMessage } from './MessageList';
import { isAssistantMessage } from './messages/index';

interface ContextInfoProps {
  messages: ChatMessage[];
  providers: Provider[];
  compact?: boolean;
}

export const ContextInfo = ({
  messages,
  providers,
  compact = false,
}: ContextInfoProps) => {
  const stats = useMemo(() => {
    const assistantMsg = messages.filter((m) => isAssistantMessage(m.info));
    const lastAssistantMsg = assistantMsg[assistantMsg.length - 1]?.info as
      | AssistantMessage
      | undefined;

    const totalCost = messages.reduce((sum, m) => {
      if (isAssistantMessage(m.info)) {
        return sum + ((m.info as AssistantMessage).cost || 0);
      }
      return sum;
    }, 0);

    if (!lastAssistantMsg) {
      if (totalCost > 0) {
        return {
          tokens: 0,
          percentage: null,
          formattedCost: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
          }).format(totalCost),
          totalTokens: 0,
        };
      }
      return null;
    }

    const t = lastAssistantMsg.tokens;
    const totalTokens =
      (t?.input ?? 0) +
      (t?.output ?? 0) +
      (t?.reasoning ?? 0) +
      (t?.cache?.read || 0) +
      (t?.cache?.write || 0);

    const provider = providers.find(
      (p) => p.id === lastAssistantMsg.providerID,
    );
    const model = Object.values(provider?.models ?? {}).find(
      (m) => m.id === lastAssistantMsg.modelID,
    );

    const contextLimit = model?.limit?.context || 0;

    const percentage =
      contextLimit > 0 ? Math.round((totalTokens / contextLimit) * 100) : null;

    return {
      tokens: totalTokens.toLocaleString(),
      percentage,
      formattedCost: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
      }).format(totalCost),
      totalTokens,
    };
  }, [messages, providers]);

  if (!stats) return null;

  const getBadgeColorClass = (pct: number | null) => {
    if (pct === null) return '';
    if (pct < 50) return '';
    if (pct < 80) return styles.medium;
    return styles.high;
  };

  const badgeClass = `${styles.badge} ${getBadgeColorClass(stats.percentage)}`;
  const rootClass = `${styles.root} ${compact ? styles.compact : ''}`;

  return (
    <div className={rootClass}>
      <div className={badgeClass}>
        {stats.percentage !== null ? `${stats.percentage}%` : stats.tokens}
      </div>
      <div className={styles.details}>
        <div className={styles.row}>
          <span className={styles.label}>{__('Tokens', 'wordforge')}</span>
          <span className={styles.value}>{stats.tokens}</span>
        </div>
        {stats.percentage !== null && (
          <div className={styles.row}>
            <span className={styles.label}>{__('Context', 'wordforge')}</span>
            <span className={styles.value}>{stats.percentage}%</span>
          </div>
        )}
        <div className={styles.row}>
          <span className={styles.label}>{__('Cost', 'wordforge')}</span>
          <span className={styles.value}>{stats.formattedCost}</span>
        </div>
      </div>
    </div>
  );
};
