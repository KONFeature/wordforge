import { Button, Card, CardBody, CardHeader, CheckboxControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';

interface SettingsFormCardProps {
  settings: {
    mcpEnabled: boolean;
    mcpNamespace: string;
    mcpRoute: string;
    mcpEndpoint: string;
  };
  optionsNonce: string;
}

export const SettingsFormCard = ({ settings, optionsNonce }: SettingsFormCardProps) => {
  const [mcpEnabled, setMcpEnabled] = useState(settings.mcpEnabled);
  const [mcpNamespace, setMcpNamespace] = useState(settings.mcpNamespace);
  const [mcpRoute, setMcpRoute] = useState(settings.mcpRoute);

  return (
    <Card className="wordforge-card">
      <CardHeader>
        <h2>{__('MCP Server Settings', 'wordforge')}</h2>
      </CardHeader>
      <CardBody>
        <form method="post" action="options.php">
          <input type="hidden" name="option_page" value="wordforge_settings" />
          <input type="hidden" name="action" value="update" />
          <input type="hidden" name="_wpnonce" value={optionsNonce} />
          
          <table className="form-table wordforge-form-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top' }}>
                  <label htmlFor="wordforge_mcp_enabled">{__('Enable MCP', 'wordforge')}</label>
                </th>
                <td style={{ padding: '15px 10px' }}>
                  <CheckboxControl
                    label={__('Enable the WordForge MCP server', 'wordforge')}
                    checked={mcpEnabled}
                    onChange={setMcpEnabled}
                    name="wordforge_settings[mcp_enabled]"
                  />
                  <p className="description" style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '4px', color: '#646970' }}>
                    {__('When disabled, no MCP endpoint will be available.', 'wordforge')}
                  </p>
                </td>
              </tr>
              <tr>
                <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top' }}>
                  <label htmlFor="wordforge_mcp_namespace">{__('Namespace', 'wordforge')}</label>
                </th>
                <td style={{ padding: '15px 10px' }}>
                  <TextControl
                    value={mcpNamespace}
                    onChange={setMcpNamespace}
                    name="wordforge_settings[mcp_namespace]"
                    help={__('REST API namespace (e.g., wordforge)', 'wordforge')}
                  />
                </td>
              </tr>
              <tr>
                <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top' }}>
                  <label htmlFor="wordforge_mcp_route">{__('Route', 'wordforge')}</label>
                </th>
                <td style={{ padding: '15px 10px' }}>
                  <TextControl
                    value={mcpRoute}
                    onChange={setMcpRoute}
                    name="wordforge_settings[mcp_route]"
                    help={__('MCP endpoint route (e.g., mcp)', 'wordforge')}
                  />
                </td>
              </tr>
              <tr>
                <th style={{ width: '200px', textAlign: 'left', padding: '15px 10px 15px 0', verticalAlign: 'top' }}>
                  {__('Endpoint URL', 'wordforge')}
                </th>
                <td style={{ padding: '15px 10px' }}>
                  {mcpEnabled ? (
                    <code style={{ background: '#f0f0f1', padding: '3px 5px' }}>{settings.mcpEndpoint}</code>
                  ) : (
                    <span style={{ background: '#646970', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>{__('Disabled', 'wordforge')}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '20px' }}>
            <Button type="submit" variant="primary">
              {__('Save Settings', 'wordforge')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};
