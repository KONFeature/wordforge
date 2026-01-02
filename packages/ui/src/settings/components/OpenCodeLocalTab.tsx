import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ExternalLink,
  Notice,
  SelectControl,
  Spinner,
  TextControl,
} from '@wordpress/components';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { checkLocalServerHealth } from '../../lib/openCodeClient';
import {
  type RuntimePreference,
  useDownloadLocalConfig,
  useLocalSettings,
  useSaveLocalSettings,
} from '../hooks/useLocalSettings';
import styles from './OpenCodeLocalTab.module.css';

interface OpenCodeLocalTabProps {
  initialPort: number;
}

export const OpenCodeLocalTab = ({ initialPort }: OpenCodeLocalTabProps) => {
  const { data: settings } = useLocalSettings();
  const { mutate: saveSettings, isPending: isSaving } = useSaveLocalSettings();
  const { mutate: downloadConfig, isPending: isDownloading } =
    useDownloadLocalConfig();

  const [port, setPort] = useState(String(initialPort));
  const [runtime, setRuntime] = useState<RuntimePreference>('node');
  const [localServerOnline, setLocalServerOnline] = useState<boolean | null>(
    null,
  );
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  const checkServer = useCallback(async () => {
    setIsCheckingServer(true);
    const portNum = Number.parseInt(port, 10) || 4096;
    const online = await checkLocalServerHealth(portNum);
    setLocalServerOnline(online);
    setIsCheckingServer(false);
  }, [port]);

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, [checkServer]);

  useEffect(() => {
    if (settings?.port) {
      setPort(String(settings.port));
    }
    if (settings?.runtime) {
      setRuntime(settings.runtime);
    }
  }, [settings?.port, settings?.runtime]);

  const handlePortChange = (value: string) => {
    setPort(value);
  };

  const handlePortBlur = () => {
    const portNum = Number.parseInt(port, 10);
    if (portNum && portNum >= 1024 && portNum <= 65535) {
      saveSettings({ port: portNum });
    }
  };

  const handleRuntimeChange = (value: string) => {
    const newRuntime = value as RuntimePreference;
    setRuntime(newRuntime);
    saveSettings({ runtime: newRuntime });
  };

  const handleDownload = () => {
    downloadConfig(runtime);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.introCard}>
        <CardHeader>
          <h2 className={styles.cardTitle}>
            {__('Connect from Your Computer', 'wordforge')}
          </h2>
        </CardHeader>
        <CardBody>
          <p className={styles.introText}>
            {__(
              'Run OpenCode on your local machine and connect it to your WordPress site. This gives you the full power of OpenCode with access to all WordForge tools.',
              'wordforge',
            )}
          </p>

          <div className={styles.statusBadge}>
            {isCheckingServer ? (
              <span className={styles.statusChecking}>
                <Spinner />
                {__('Checking...', 'wordforge')}
              </span>
            ) : localServerOnline ? (
              <span className={styles.statusOnline}>
                ✓ {__('Local server detected', 'wordforge')}
              </span>
            ) : (
              <span className={styles.statusOffline}>
                ○ {__('Local server not running', 'wordforge')}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className={styles.stepsCard}>
        <CardHeader>
          <h2 className={styles.cardTitle}>{__('Setup Guide', 'wordforge')}</h2>
        </CardHeader>
        <CardBody>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {__('Install OpenCode', 'wordforge')}
                </h3>
                <p className={styles.stepDescription}>
                  {__(
                    'Download and install OpenCode on your computer. Available for macOS, Windows, and Linux.',
                    'wordforge',
                  )}
                </p>
                <ExternalLink
                  href="https://opencode.ai/"
                  className={styles.externalLink}
                >
                  {__('Get OpenCode →', 'wordforge')}
                </ExternalLink>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {__('Download Configuration', 'wordforge')}
                </h3>
                <p className={styles.stepDescription}>
                  {__(
                    'Select your JavaScript runtime and download the configuration files for your WordPress site.',
                    'wordforge',
                  )}
                </p>
                <SelectControl
                  label={__('JavaScript Runtime', 'wordforge')}
                  value={runtime}
                  options={[
                    { value: 'node', label: __('Node.js', 'wordforge') },
                    { value: 'bun', label: __('Bun', 'wordforge') },
                    {
                      value: 'none',
                      label: __('None (Remote MCP only)', 'wordforge'),
                    },
                  ]}
                  onChange={handleRuntimeChange}
                  help={
                    runtime === 'none'
                      ? __(
                          'No local MCP server will be used. OpenCode will connect directly to WordPress via remote MCP.',
                          'wordforge',
                        )
                      : __(
                          'The MCP server binary will be included in the download and run using your selected runtime.',
                          'wordforge',
                        )
                  }
                  disabled={isSaving}
                  className={styles.runtimeSelect}
                />
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className={styles.downloadButton}
                >
                  {isDownloading ? (
                    <>
                      <Spinner />
                      {__('Downloading...', 'wordforge')}
                    </>
                  ) : (
                    __('Download Config ZIP', 'wordforge')
                  )}
                </Button>
                <Notice
                  status="warning"
                  isDismissible={false}
                  className={styles.securityNote}
                >
                  <strong>{__('Keep this file secure!', 'wordforge')}</strong>{' '}
                  {__(
                    'The configuration contains credentials to access your WordPress site.',
                    'wordforge',
                  )}
                </Notice>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {__('Extract and Open', 'wordforge')}
                </h3>
                <p className={styles.stepDescription}>
                  {runtime === 'none'
                    ? __(
                        'Extract the ZIP file to a folder on your computer. The config will connect directly to WordPress via remote MCP.',
                        'wordforge',
                      )
                    : __(
                        'Extract the ZIP file to a folder on your computer. It includes the MCP server binary that will run locally.',
                        'wordforge',
                      )}
                </p>
                <ul className={styles.commandList}>
                  <li>
                    <strong>{__('Terminal:', 'wordforge')}</strong>{' '}
                    <code>cd ~/path/to/folder && opencode</code>
                  </li>
                  <li>
                    <strong>{__('OpenCode Desktop:', 'wordforge')}</strong>{' '}
                    {__('File → Open Folder', 'wordforge')}
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {runtime === 'none'
                    ? __('Start Chatting', 'wordforge')
                    : __('Start the Server', 'wordforge')}
                </h3>
                {runtime === 'none' ? (
                  <p className={styles.stepDescription}>
                    {__(
                      'You can start chatting immediately! OpenCode will connect to WordPress via the remote MCP endpoint.',
                      'wordforge',
                    )}
                  </p>
                ) : (
                  <>
                    <p className={styles.stepDescription}>
                      {__(
                        'Start the OpenCode server so WordPress can connect to it:',
                        'wordforge',
                      )}
                    </p>
                    <code className={styles.command}>
                      opencode serve --port {port}
                    </code>
                  </>
                )}
                <p className={styles.stepNote}>
                  {__(
                    'Once running, you can chat from this WordPress admin or from OpenCode directly.',
                    'wordforge',
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className={styles.settingsCard}>
        <CardHeader>
          <h2 className={styles.cardTitle}>
            {__('Connection Settings', 'wordforge')}
          </h2>
        </CardHeader>
        <CardBody>
          <TextControl
            label={__('Local Server Port', 'wordforge')}
            help={__(
              'The port where OpenCode is running. Must match the --port flag used with "opencode serve".',
              'wordforge',
            )}
            value={port}
            onChange={handlePortChange}
            onBlur={handlePortBlur}
            type="number"
            min={1024}
            max={65535}
            disabled={isSaving}
            className={styles.portInput}
          />
          <Button
            variant="secondary"
            onClick={checkServer}
            disabled={isCheckingServer}
            className={styles.checkButton}
          >
            {isCheckingServer ? (
              <>
                <Spinner />
                {__('Checking...', 'wordforge')}
              </>
            ) : (
              __('Check Connection', 'wordforge')
            )}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};
