import type { McpStatus, Provider } from '@opencode-ai/sdk/client';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './ConfigPanel.module.css';

interface ConfigPanelProps {
  providers: Provider[];
  mcpStatus: Record<string, McpStatus>;
  isLoading: boolean;
}

const getMcpStatusColor = (
  status: McpStatus,
): { bg: string; color: string } => {
  switch (status.status) {
    case 'connected':
      return {
        bg: 'var(--wf-color-success-bg)',
        color: 'var(--wf-color-success-text)',
      };
    case 'disabled':
      return {
        bg: 'var(--wf-color-bg-code)',
        color: 'var(--wf-color-text-muted)',
      };
    case 'failed':
    case 'needs_auth':
    case 'needs_client_registration':
      return {
        bg: 'var(--wf-color-error-bg)',
        color: 'var(--wf-color-error-text)',
      };
    default:
      return {
        bg: 'var(--wf-color-bg-code)',
        color: 'var(--wf-color-text-muted)',
      };
  }
};

const getMcpStatusLabel = (status: McpStatus): string => {
  switch (status.status) {
    case 'connected':
      return __('Connected', 'wordforge');
    case 'disabled':
      return __('Disabled', 'wordforge');
    case 'failed':
      return __('Failed', 'wordforge');
    case 'needs_auth':
      return __('Needs Auth', 'wordforge');
    case 'needs_client_registration':
      return __('Needs Registration', 'wordforge');
    default:
      return 'Unknown';
  }
};

export const ConfigPanel = ({
  providers,
  mcpStatus,
  isLoading,
}: ConfigPanelProps) => {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <Spinner />
          <span className={styles.loadingText}>
            {__('Loading configuration...', 'wordforge')}
          </span>
        </div>
      </div>
    );
  }

  const mcpServers =
    mcpStatus && typeof mcpStatus === 'object' ? Object.entries(mcpStatus) : [];
  const totalModels = Array.isArray(providers)
    ? providers.reduce((acc, p) => acc + Object.keys(p.models || {}).length, 0)
    : 0;

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            {__('Providers', 'wordforge')} ({providers.length})
          </div>
          <div className={styles.tagList}>
            {(Array.isArray(providers) ? providers : []).map((provider) => {
              const modelCount = Object.keys(provider.models || {}).length;
              return (
                <span
                  key={provider.id}
                  className={styles.providerTag}
                  title={`${modelCount} models`}
                >
                  {provider.name}
                  <span className={styles.tagCount}>({modelCount})</span>
                </span>
              );
            })}
            {providers.length === 0 && (
              <span className={styles.emptyText}>
                {__('No providers configured', 'wordforge')}
              </span>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            {__('MCP Servers', 'wordforge')} ({mcpServers.length})
          </div>
          <div className={styles.tagList}>
            {mcpServers.map(([name, status]) => {
              const colors = getMcpStatusColor(status);
              return (
                <span
                  key={name}
                  className={styles.mcpTag}
                  style={{ background: colors.bg, color: colors.color }}
                  title={getMcpStatusLabel(status)}
                >
                  {name}
                </span>
              );
            })}
            {mcpServers.length === 0 && (
              <span className={styles.emptyText}>
                {__('No MCP servers', 'wordforge')}
              </span>
            )}
          </div>
        </div>

        <div className={styles.sectionAuto}>
          <div className={styles.sectionTitle}>
            {__('Total Models', 'wordforge')}
          </div>
          <span className={styles.totalModels}>{totalModels}</span>
        </div>
      </div>
    </div>
  );
};
