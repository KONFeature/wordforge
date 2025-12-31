import { Card, CardBody, CardHeader } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

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
          <p
            style={{
              background: '#fff3cd',
              borderLeft: '4px solid #dba617',
              padding: '12px',
              margin: 0,
            }}
          >
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

        <table
          className="wordforge-status-table"
          style={{ width: '100%', marginBottom: '20px' }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '8px 0' }}>
                {__('HTTP Endpoint', 'wordforge')}
              </td>
              <td>
                <code>{settings.mcpEndpoint}</code>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0' }}>
                {__('STDIO Command', 'wordforge')}
              </td>
              <td>
                <code>{`wp mcp-adapter serve --server=${settings.serverId}`}</code>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>{__('Claude Desktop Config', 'wordforge')}</h3>
        <pre
          style={{
            background: '#f6f7f7',
            padding: '12px',
            overflow: 'auto',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          {claudeConfig}
        </pre>
        <p
          className="description"
          style={{ fontSize: '13px', color: '#646970' }}
        >
          {__('Generate credentials:', 'wordforge')}{' '}
          <code>echo -n "username:app_password" | base64</code>
        </p>

        <h3 style={{ marginTop: '20px' }}>{__('Setup Guides', 'wordforge')}</h3>
        <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
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
