import type { McpStatus, Provider } from '@opencode-ai/sdk/client';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

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
      return { bg: '#d4edda', color: '#155724' };
    case 'disabled':
      return { bg: '#f0f0f1', color: '#646970' };
    case 'failed':
    case 'needs_auth':
    case 'needs_client_registration':
      return { bg: '#f8d7da', color: '#721c24' };
    default:
      return { bg: '#f0f0f1', color: '#646970' };
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
      return status.status;
  }
};

export const ConfigPanel = ({
  providers,
  mcpStatus,
  isLoading,
}: ConfigPanelProps) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #c3c4c7',
          background: '#f6f7f7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Spinner />
          <span style={{ fontSize: '12px', color: '#646970' }}>
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
    <div
      style={{
        borderTop: '1px solid #c3c4c7',
        background: '#f6f7f7',
        fontSize: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <div
            style={{ fontWeight: 600, marginBottom: '8px', color: '#1d2327' }}
          >
            {__('Providers', 'wordforge')} ({providers.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {(Array.isArray(providers) ? providers : []).map((provider) => {
              const modelCount = Object.keys(provider.models || {}).length;
              return (
                <span
                  key={provider.id}
                  style={{
                    padding: '2px 8px',
                    background: '#fff',
                    border: '1px solid #dcdcde',
                    borderRadius: '3px',
                    fontSize: '11px',
                  }}
                  title={`${modelCount} models`}
                >
                  {provider.name}
                  <span style={{ color: '#646970', marginLeft: '4px' }}>
                    ({modelCount})
                  </span>
                </span>
              );
            })}
            {providers.length === 0 && (
              <span style={{ color: '#646970', fontStyle: 'italic' }}>
                {__('No providers configured', 'wordforge')}
              </span>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <div
            style={{ fontWeight: 600, marginBottom: '8px', color: '#1d2327' }}
          >
            {__('MCP Servers', 'wordforge')} ({mcpServers.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {mcpServers.map(([name, status]) => {
              const colors = getMcpStatusColor(status);
              return (
                <span
                  key={name}
                  style={{
                    padding: '2px 8px',
                    background: colors.bg,
                    color: colors.color,
                    borderRadius: '3px',
                    fontSize: '11px',
                  }}
                  title={getMcpStatusLabel(status)}
                >
                  {name}
                </span>
              );
            })}
            {mcpServers.length === 0 && (
              <span style={{ color: '#646970', fontStyle: 'italic' }}>
                {__('No MCP servers', 'wordforge')}
              </span>
            )}
          </div>
        </div>

        <div style={{ flex: '0 0 auto' }}>
          <div
            style={{ fontWeight: 600, marginBottom: '8px', color: '#1d2327' }}
          >
            {__('Total Models', 'wordforge')}
          </div>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#2271b1' }}>
            {totalModels}
          </span>
        </div>
      </div>
    </div>
  );
};
