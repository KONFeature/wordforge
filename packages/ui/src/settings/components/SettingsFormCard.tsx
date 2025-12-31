import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CheckboxControl,
  TextControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './SettingsFormCard.module.css';

interface SettingsFormCardProps {
  settings: {
    mcpEnabled: boolean;
    mcpNamespace: string;
    mcpRoute: string;
    mcpEndpoint: string;
  };
  optionsNonce: string;
}

export const SettingsFormCard = ({
  settings,
  optionsNonce,
}: SettingsFormCardProps) => {
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

          <table className={`form-table wordforge-form-table ${styles.table}`}>
            <tbody>
              <tr>
                <th className={styles.tableHeader}>
                  <label htmlFor="wordforge_mcp_enabled">
                    {__('Enable MCP', 'wordforge')}
                  </label>
                </th>
                <td className={styles.tableCell}>
                  <CheckboxControl
                    label={__('Enable the WordForge MCP server', 'wordforge')}
                    checked={mcpEnabled}
                    onChange={setMcpEnabled}
                    name="wordforge_settings[mcp_enabled]"
                  />
                  <p className={`description ${styles.description}`}>
                    {__(
                      'When disabled, no MCP endpoint will be available.',
                      'wordforge',
                    )}
                  </p>
                </td>
              </tr>
              <tr>
                <th className={styles.tableHeader}>
                  <label htmlFor="wordforge_mcp_namespace">
                    {__('Namespace', 'wordforge')}
                  </label>
                </th>
                <td className={styles.tableCell}>
                  <TextControl
                    value={mcpNamespace}
                    onChange={setMcpNamespace}
                    name="wordforge_settings[mcp_namespace]"
                    help={__(
                      'REST API namespace (e.g., wordforge)',
                      'wordforge',
                    )}
                  />
                </td>
              </tr>
              <tr>
                <th className={styles.tableHeader}>
                  <label htmlFor="wordforge_mcp_route">
                    {__('Route', 'wordforge')}
                  </label>
                </th>
                <td className={styles.tableCell}>
                  <TextControl
                    value={mcpRoute}
                    onChange={setMcpRoute}
                    name="wordforge_settings[mcp_route]"
                    help={__('MCP endpoint route (e.g., mcp)', 'wordforge')}
                  />
                </td>
              </tr>
              <tr>
                <th className={styles.tableHeader}>
                  {__('Endpoint URL', 'wordforge')}
                </th>
                <td className={styles.tableCell}>
                  {mcpEnabled ? (
                    <code className={styles.code}>{settings.mcpEndpoint}</code>
                  ) : (
                    <span className={styles.disabledBadge}>
                      {__('Disabled', 'wordforge')}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className={styles.submitRow}>
            <Button type="submit" variant="primary">
              {__('Save Settings', 'wordforge')}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};
