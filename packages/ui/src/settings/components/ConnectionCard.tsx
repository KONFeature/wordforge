import { Card, CardBody, CardHeader } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './ConnectionCard.module.css';

interface ConnectionCardProps {
  settings: {
    mcpEnabled: boolean;
    mcpEndpoint: string;
    serverId: string;
  };
}

export const ConnectionCard = ({ settings }: ConnectionCardProps) => {
  if (!settings.mcpEnabled) {
    return (
      <Card className="wordforge-card wordforge-card-wide">
        <CardHeader>
          <h2>{__('MCP Connection', 'wordforge')}</h2>
        </CardHeader>
        <CardBody>
          <p className={styles.disabledNotice}>
            {__(
              'MCP server is currently disabled. Enable it in the settings above to connect.',
              'wordforge',
            )}
          </p>
        </CardBody>
      </Card>
    );
  }

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

  return (
    <Card className="wordforge-card wordforge-card-wide">
      <CardHeader>
        <h2>{__('MCP Connection', 'wordforge')}</h2>
      </CardHeader>
      <CardBody>
        <p className="description">
          {__('Use these details to connect your MCP client.', 'wordforge')}
        </p>

        <table className={`wordforge-status-table ${styles.table}`}>
          <tbody>
            <tr>
              <td className={styles.tableCell}>
                {__('HTTP Endpoint', 'wordforge')}
              </td>
              <td>
                <code>{settings.mcpEndpoint}</code>
              </td>
            </tr>
            <tr>
              <td className={styles.tableCell}>
                {__('STDIO Command', 'wordforge')}
              </td>
              <td>
                <code>{`wp mcp-adapter serve --server=${settings.serverId}`}</code>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>{__('Claude Desktop Config', 'wordforge')}</h3>
        <pre className={styles.codeBlock}>{claudeConfig}</pre>
        <p className={`description ${styles.hint}`}>
          {__('Generate credentials:', 'wordforge')}{' '}
          <code>echo -n "username:app_password" | base64</code>
        </p>

        <h3 className={styles.linksTitle}>{__('Setup Guides', 'wordforge')}</h3>
        <ul className={styles.links}>
          <li>
            <a
              href="https://modelcontextprotocol.io/quickstart/user"
              target="_blank"
              rel="noopener noreferrer"
            >
              {__('MCP Quickstart Guide', 'wordforge')} ↗
            </a>
          </li>
          <li>
            <a
              href="https://docs.anthropic.com/en/docs/claude-code/mcp"
              target="_blank"
              rel="noopener noreferrer"
            >
              {__('Claude Code MCP Documentation', 'wordforge')} ↗
            </a>
          </li>
          <li>
            <a
              href="https://opencode.ai/docs/tools/mcp-servers"
              target="_blank"
              rel="noopener noreferrer"
            >
              {__('OpenCode MCP Servers', 'wordforge')} ↗
            </a>
          </li>
        </ul>
      </CardBody>
    </Card>
  );
};
