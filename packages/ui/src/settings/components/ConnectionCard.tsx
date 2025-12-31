import {
  Card,
  CardBody,
  CardHeader,
  ClipboardButton,
  ExternalLink,
  TabPanel,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './ConnectionCard.module.css';

interface ConnectionCardProps {
  settings: {
    mcpEnabled: boolean;
    mcpEndpoint: string;
    serverId: string;
  };
}

type TabName = 'claude' | 'opencode-local' | 'opencode-remote';

export const ConnectionCard = ({ settings }: ConnectionCardProps) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  if (!settings.mcpEnabled) {
    return (
      <Card className="wordforge-card">
        <CardHeader>
          <h2>{__('MCP Connection', 'wordforge')}</h2>
        </CardHeader>
        <CardBody>
          <p className={styles.disabledNotice}>
            {__(
              'MCP server is currently disabled. Enable it in the MCP Settings below to connect external clients.',
              'wordforge',
            )}
          </p>
        </CardBody>
      </Card>
    );
  }

  const handleCopy = (tabName: string) => {
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        wordforge: {
          command: 'npx',
          args: [
            '-y',
            '@anthropic-ai/mcp-remote@latest',
            settings.mcpEndpoint,
            '--header',
            'Authorization: Basic YOUR_BASE64_CREDENTIALS',
          ],
        },
      },
    },
    null,
    2,
  );

  const openCodeLocalConfig = JSON.stringify(
    {
      mcp: {
        wordpress: {
          enabled: true,
          type: 'local',
          command: ['node', './path/to/wordforge-server.js'],
          environment: {
            WORDPRESS_URL: settings.mcpEndpoint.replace(
              '/wordforge/mcp',
              '/wp-abilities/v1',
            ),
            WORDPRESS_USERNAME: 'your-username',
            WORDPRESS_APP_PASSWORD: 'xxxx xxxx xxxx xxxx xxxx xxxx',
          },
        },
      },
    },
    null,
    2,
  );

  const openCodeRemoteConfig = JSON.stringify(
    {
      mcp: {
        wordpress: {
          enabled: true,
          type: 'remote',
          url: settings.mcpEndpoint,
          headers: {
            Authorization: 'Basic YOUR_BASE64_CREDENTIALS',
          },
        },
      },
    },
    null,
    2,
  );

  const tabs = [
    {
      name: 'claude' as const,
      title: __('Claude Desktop', 'wordforge'),
    },
    {
      name: 'opencode-local' as const,
      title: __('OpenCode (Local)', 'wordforge'),
    },
    {
      name: 'opencode-remote' as const,
      title: __('OpenCode (Remote)', 'wordforge'),
    },
  ];

  const renderTabContent = (tabName: TabName) => {
    if (tabName === 'claude') {
      return (
        <div className={styles.tabContent}>
          <div className={styles.method}>
            <h4>{__('Option A: Bundle File (Recommended)', 'wordforge')}</h4>
            <ol className={styles.steps}>
              <li>
                {__('Download', 'wordforge')} <code>wordforge.mcpb</code>{' '}
                {__('from the', 'wordforge')}{' '}
                <ExternalLink href="https://github.com/KONFeature/wordforge/releases">
                  {__('latest release', 'wordforge')}
                </ExternalLink>
              </li>
              <li>
                {__(
                  'Double-click the file or drag it into Claude Desktop',
                  'wordforge',
                )}
              </li>
              <li>
                {__(
                  'Configure your WordPress credentials when prompted',
                  'wordforge',
                )}
              </li>
            </ol>
          </div>

          <div className={styles.method}>
            <h4>{__('Option B: Manual Configuration', 'wordforge')}</h4>
            <p className={styles.hint}>
              {__('Add this to your Claude Desktop config file:', 'wordforge')}
            </p>
            <div className={styles.codeWrapper}>
              <pre className={styles.codeBlock}>{claudeConfig}</pre>
              <ClipboardButton
                text={claudeConfig}
                className={styles.copyButton}
                onCopy={() => handleCopy('claude')}
              >
                {copiedTab === 'claude'
                  ? __('Copied!', 'wordforge')
                  : __('Copy', 'wordforge')}
              </ClipboardButton>
            </div>
            <p className={styles.hint}>
              {__('Generate credentials:', 'wordforge')}{' '}
              <code>echo -n "username:app_password" | base64</code>
            </p>
          </div>
        </div>
      );
    }

    if (tabName === 'opencode-local') {
      return (
        <div className={styles.tabContent}>
          <div className={styles.recommended}>
            {__(
              'Recommended for better performance and error handling.',
              'wordforge',
            )}
          </div>

          <ol className={styles.steps}>
            <li>
              {__('Download', 'wordforge')} <code>wordforge-server.js</code>{' '}
              {__('from the', 'wordforge')}{' '}
              <ExternalLink href="https://github.com/KONFeature/wordforge/releases">
                {__('latest release', 'wordforge')}
              </ExternalLink>
            </li>
            <li>
              {__('Add this to your', 'wordforge')} <code>.opencode.json</code>{' '}
              {__('or global config:', 'wordforge')}
            </li>
          </ol>

          <div className={styles.codeWrapper}>
            <pre className={styles.codeBlock}>{openCodeLocalConfig}</pre>
            <ClipboardButton
              text={openCodeLocalConfig}
              className={styles.copyButton}
              onCopy={() => handleCopy('opencode-local')}
            >
              {copiedTab === 'opencode-local'
                ? __('Copied!', 'wordforge')
                : __('Copy', 'wordforge')}
            </ClipboardButton>
          </div>

          <p className={styles.hint}>
            {__(
              'Update the path to wordforge-server.js and add your credentials.',
              'wordforge',
            )}
          </p>
        </div>
      );
    }

    return (
      <div className={styles.tabContent}>
        <p className={styles.hint}>
          {__('Add this to your', 'wordforge')} <code>.opencode.json</code>{' '}
          {__('or global config:', 'wordforge')}
        </p>

        <div className={styles.codeWrapper}>
          <pre className={styles.codeBlock}>{openCodeRemoteConfig}</pre>
          <ClipboardButton
            text={openCodeRemoteConfig}
            className={styles.copyButton}
            onCopy={() => handleCopy('opencode-remote')}
          >
            {copiedTab === 'opencode-remote'
              ? __('Copied!', 'wordforge')
              : __('Copy', 'wordforge')}
          </ClipboardButton>
        </div>

        <p className={styles.hint}>
          {__('Generate credentials:', 'wordforge')}{' '}
          <code>echo -n "username:app_password" | base64</code>
        </p>
      </div>
    );
  };

  return (
    <Card className="wordforge-card">
      <CardHeader className={styles.header}>
        <h2>{__('MCP Connection', 'wordforge')}</h2>
        <div className={styles.endpoint}>
          <span className={styles.endpointLabel}>
            {__('Endpoint:', 'wordforge')}
          </span>
          <code>{settings.mcpEndpoint}</code>
        </div>
      </CardHeader>
      <CardBody>
        <TabPanel tabs={tabs} className={styles.tabPanel}>
          {(tab) => renderTabContent(tab.name as TabName)}
        </TabPanel>

        <div className={styles.credentialsSection}>
          <h3>{__('Getting Your Credentials', 'wordforge')}</h3>
          <ol className={styles.steps}>
            <li>
              {__('Go to', 'wordforge')}{' '}
              <strong>{__('Users → Profile', 'wordforge')}</strong>{' '}
              {__('in WordPress admin', 'wordforge')}
            </li>
            <li>
              {__('Scroll to', 'wordforge')}{' '}
              <strong>{__('Application Passwords', 'wordforge')}</strong>
            </li>
            <li>
              {__(
                'Enter a name (e.g., "WordForge MCP") and click',
                'wordforge',
              )}{' '}
              <strong>{__('Add New Application Password', 'wordforge')}</strong>
            </li>
            <li>
              {__('Copy the generated password (spaces are fine)', 'wordforge')}
            </li>
          </ol>
        </div>

        <div className={styles.links}>
          <ExternalLink href="https://modelcontextprotocol.io/quickstart/user">
            {__('MCP Quickstart Guide', 'wordforge')}
          </ExternalLink>
          <ExternalLink href="https://docs.anthropic.com/en/docs/claude-code/mcp">
            {__('Claude Code MCP Docs', 'wordforge')}
          </ExternalLink>
          <ExternalLink href="https://opencode.ai/docs/tools/mcp-servers">
            {__('OpenCode MCP Servers', 'wordforge')}
          </ExternalLink>
        </div>
      </CardBody>
    </Card>
  );
};
