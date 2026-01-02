import { Notice } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { WordForgeSettingsConfig } from '../types';
import styles from './SettingsApp.module.css';
import { AbilitiesCard } from './components/AbilitiesCard';
import { AgentConfigCard } from './components/AgentConfigCard';
import { ConnectionCard } from './components/ConnectionCard';
import { ProvidersCard } from './components/ProvidersCard';
import { SettingsFormCard } from './components/SettingsFormCard';
import { StatusCard } from './components/StatusCard';

export const SettingsApp = () => {
  const [config] = useState<WordForgeSettingsConfig | undefined>(
    () => window.wordforgeSettings,
  );

  if (!config) {
    return (
      <div className={styles.configMissing}>
        WordForge Settings Configuration Missing
      </div>
    );
  }

  const handleStatusChange = () => {
    window.location.reload();
  };

  const statusProps = {
    mcpAdapter: config.integrations.mcpAdapter,
    woocommerce: config.integrations.woocommerce,
    pluginVersion: config.settings.pluginVersion,
    binary: {
      is_installed: config.settings.platformInfo.is_installed,
      version: config.settings.platformInfo.version || 'unknown',
      os: config.settings.platformInfo.os,
      arch: config.settings.platformInfo.arch,
    },
    server: {
      running: config.settings.serverRunning,
      port: config.settings.serverPort || 0,
    },
  };

  const serverRunning = config.settings.serverRunning;
  const execEnabled = config.settings.execEnabled;

  return (
    <div className="wordforge-settings-container">
      <div className={`wordforge-cards ${styles.cards}`}>
        {!execEnabled && (
          <div className={styles.fullWidth}>
            <Notice status="warning" isDismissible={false}>
              <strong>{__('AI Agent Unavailable', 'wordforge')}</strong>
              <p>
                {__(
                  'Your hosting provider has disabled process execution (exec), which is required to run the AI agent. The MCP abilities are still available for external clients like Claude Desktop.',
                  'wordforge',
                )}
              </p>
              <p>
                <em>
                  {__(
                    'Alternatives coming soon: Remote server mode and browser-based AI.',
                    'wordforge',
                  )}
                </em>
              </p>
            </Notice>
          </div>
        )}

        {execEnabled && (
          <div className={styles.fullWidth}>
            <StatusCard
              status={statusProps}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}

        {execEnabled && (
          <ProvidersCard restUrl={config.restUrl} nonce={config.nonce} />
        )}

        {execEnabled && (
          <AgentConfigCard
            restUrl={config.restUrl}
            nonce={config.nonce}
            initialAgents={config.agents}
            serverRunning={serverRunning}
            onStartServer={() => handleStatusChange()}
          />
        )}

        <div className={styles.fullWidth}>
          <ConnectionCard
            settings={{
              mcpEnabled: config.settings.mcpEnabled,
              mcpEndpoint: config.settings.mcpEndpoint,
              serverId: config.settings.serverId,
            }}
          />
        </div>

        <SettingsFormCard
          settings={{
            mcpEnabled: config.settings.mcpEnabled,
            mcpNamespace: config.settings.mcpNamespace,
            mcpRoute: config.settings.mcpRoute,
            mcpEndpoint: config.settings.mcpEndpoint,
          }}
          optionsNonce={config.optionsNonce}
        />

        <AbilitiesCard
          abilities={config.abilities}
          wooCommerceActive={config.integrations.woocommerce}
        />
      </div>
    </div>
  );
};
