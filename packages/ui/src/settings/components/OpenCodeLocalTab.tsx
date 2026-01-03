import {
  Button,
  Card,
  CardBody,
  CheckboxControl,
  ClipboardButton,
  ExternalLink,
  Icon,
  Notice,
  SelectControl,
  Spinner,
} from '@wordpress/components';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { checkLocalServerHealth } from '../../lib/openCodeClient';
import {
  type RuntimePreference,
  useDownloadLocalConfig,
  useLocalSettings,
  useSaveLocalSettings,
} from '../hooks/useLocalSettings';
import styles from './OpenCodeLocalTab.module.css';

// SVG Icons
const appleIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <title>Apple</title>
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.48C2.7 15.25 3.51 7.59 10.23 7.5c.64.03 1.25.32 1.69.57.46.26 1 .53 1.54.53.53 0 1.05-.26 1.54-.53.46-.26 1.09-.56 1.76-.58 2.26-.08 4.02 1.59 4.24 2.19-3.71 1.76-2.82 6.56.88 8.08-.66 1.53-1.61 3.25-2.83 4.52zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.54 4.5-3.74 4.25z" />
  </svg>
);

const windowsIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <title>Windows</title>
    <path d="M22 2L11.2 3.6v8l10.8-.1V2zM10.2 12.5L2 12.4v6.8l8.2 1.1v-7.8zM2 4.8l8.2 1.1v6.2l-8.2.1V4.8zM22 12.4l-10.8-.1v8.8L22 22v-9.6z" />
  </svg>
);

const linuxIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <title>Linux</title>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </svg>
);

const checkIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <title>Check</title>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

type OS = 'mac' | 'windows' | 'linux';

const getInitialOS = (): OS => {
  const platform = window.navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'mac';
  if (platform.includes('win')) return 'windows';
  return 'linux';
};

interface OpenCodeLocalTabProps {
  initialPort: number;
}

export const OpenCodeLocalTab = ({ initialPort }: OpenCodeLocalTabProps) => {
  const { data: settings } = useLocalSettings();
  const { mutate: saveSettings, isPending: isSaving } = useSaveLocalSettings();
  const { mutate: downloadConfig, isPending: isDownloading } =
    useDownloadLocalConfig();

  const [os, setOs] = useState<OS>(getInitialOS());
  const [port, setPort] = useState(String(initialPort));
  const [runtime, setRuntime] = useState<RuntimePreference>('node');
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localServerOnline, setLocalServerOnline] = useState<boolean | null>(
    null,
  );
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Sync settings
  useEffect(() => {
    if (settings?.port) setPort(String(settings.port));
    if (settings?.runtime) setRuntime(settings.runtime);
  }, [settings]);

  // Server health check
  const checkServer = useCallback(async () => {
    setIsCheckingServer(true);
    const portNum = Number.parseInt(port, 10) || 4096;
    const online = await checkLocalServerHealth(portNum);
    setLocalServerOnline(online);
    setIsCheckingServer(false);

    if (online) {
      setCompletedSteps((prev) => new Set([...prev, 4]));
      setActiveStep(4);
    }
  }, [port]);

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, [checkServer]);

  // Handlers
  const handleStepComplete = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
    if (step < 4) setActiveStep(step + 1);
  };

  const handleStepClick = (step: number) => {
    if (step <= activeStep || completedSteps.has(step - 1)) {
      setActiveStep(step);
    }
  };

  const handleDownload = () => {
    downloadConfig(runtime);
    handleStepComplete(2);
  };

  const handlePortChange = (value: string) => setPort(value);
  const handlePortBlur = () => {
    const portNum = Number.parseInt(port, 10);
    if (portNum && portNum >= 1024 && portNum <= 65535) {
      saveSettings({ port: portNum });
    }
  };

  // OS Specific Content
  const installInstructions = useMemo(() => {
    switch (os) {
      case 'mac':
        return __(
          'Download for macOS, then drag to your Applications folder.',
          'wordforge',
        );
      case 'windows':
        return __(
          'Download the Windows installer and run the setup wizard.',
          'wordforge',
        );
      case 'linux':
        return __(
          'Download the AppImage or install via your package manager.',
          'wordforge',
        );
    }
  }, [os]);

  const extractInstructions = useMemo(() => {
    switch (os) {
      case 'mac':
        return __(
          'Double-click the ZIP file to extract it. We recommend moving the folder to your Documents for easy access.',
          'wordforge',
        );
      case 'windows':
        return __(
          'Right-click the ZIP and select "Extract All...". Extract it to your Documents folder.',
          'wordforge',
        );
      case 'linux':
        return __(
          'Extract the archive to a convenient location like ~/Documents.',
          'wordforge',
        );
    }
  }, [os]);

  const startCommand = useMemo(() => {
    const portFlag = port !== '4096' ? ` --port ${port}` : '';
    const corsFlag = ` --cors ${window.location.origin}`;

    // Using site name for folder suggestion if possible, else generic
    const folderName = 'wordforge-config';

    switch (os) {
      case 'mac':
      case 'linux':
        return `cd ~/Documents/${folderName} && opencode serve${portFlag}${corsFlag}`;
      case 'windows':
        return `cd %USERPROFILE%\\Documents\\${folderName}\nopencode serve${portFlag}${corsFlag}`;
    }
  }, [os, port]);

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <Card className={styles.introCard}>
        <div className={styles.introContent}>
          <h2 className={styles.introTitle}>
            <Icon icon="desktop" style={{ fill: 'white', marginRight: 8 }} />
            {__('Run Locally, Control Globally', 'wordforge')}
          </h2>
          <p className={styles.introText}>
            {__(
              'Connect your local OpenCode assistant to WordPress. This gives you faster performance, better privacy, and full access to your file system while working on your site.',
              'wordforge',
            )}
          </p>
        </div>
      </Card>

      {/* OS Selector */}
      <div className={styles.osSelector}>
        <button
          className={`${styles.osButton} ${os === 'mac' ? styles.osButtonActive : ''}`}
          onClick={() => setOs('mac')}
          type="button"
        >
          {appleIcon} macOS
        </button>
        <button
          className={`${styles.osButton} ${os === 'windows' ? styles.osButtonActive : ''}`}
          onClick={() => setOs('windows')}
          type="button"
        >
          {windowsIcon} Windows
        </button>
        <button
          className={`${styles.osButton} ${os === 'linux' ? styles.osButtonActive : ''}`}
          onClick={() => setOs('linux')}
          type="button"
        >
          {linuxIcon} Linux
        </button>
      </div>

      {/* Wizard Steps */}
      <div className={styles.wizardContainer}>
        {/* Step 1: Install */}
        <div
          className={`${styles.wizardStep} ${
            activeStep === 1 ? styles.wizardStepActive : ''
          } ${completedSteps.has(1) ? styles.wizardStepCompleted : ''}`}
        >
          <button
            className={`${styles.stepHeader} ${activeStep < 1 ? styles.stepHeaderDisabled : ''}`}
            onClick={() => handleStepClick(1)}
            type="button"
            style={{
              width: '100%',
              border: 'none',
              background: 'white',
              textAlign: 'left',
            }}
          >
            <div className={styles.stepIndicator}>
              {completedSteps.has(1) ? checkIcon : '1'}
            </div>
            <h3 className={styles.stepTitle}>
              {__('Install OpenCode', 'wordforge')}
            </h3>
            {completedSteps.has(1) && (
              <span className={styles.stepCheck}>✓</span>
            )}
          </button>

          {activeStep === 1 && (
            <div className={styles.stepBody}>
              <p className={styles.stepDescription}>{installInstructions}</p>
              <ExternalLink
                href="https://opencode.ai/"
                className="components-button is-primary"
              >
                {__('Download OpenCode', 'wordforge')}
                <Icon icon="external" style={{ marginLeft: 4 }} />
              </ExternalLink>

              <div className={styles.stepActions}>
                <CheckboxControl
                  label={__('I have installed OpenCode', 'wordforge')}
                  checked={completedSteps.has(1)}
                  onChange={() => handleStepComplete(1)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Download Config */}
        <div
          className={`${styles.wizardStep} ${
            activeStep === 2 ? styles.wizardStepActive : ''
          } ${completedSteps.has(2) ? styles.wizardStepCompleted : ''}`}
        >
          <button
            className={`${styles.stepHeader} ${activeStep < 2 ? styles.stepHeaderDisabled : ''}`}
            onClick={() => handleStepClick(2)}
            type="button"
            style={{
              width: '100%',
              border: 'none',
              background: 'white',
              textAlign: 'left',
            }}
          >
            <div className={styles.stepIndicator}>
              {completedSteps.has(2) ? checkIcon : '2'}
            </div>
            <h3 className={styles.stepTitle}>
              {__('Download Configuration', 'wordforge')}
            </h3>
            {completedSteps.has(2) && (
              <span className={styles.stepCheck}>✓</span>
            )}
          </button>

          {activeStep === 2 && (
            <div className={styles.stepBody}>
              <p className={styles.stepDescription}>
                {__(
                  'Get the configuration files specifically generated for this WordPress site.',
                  'wordforge',
                )}
              </p>

              <Notice
                status="warning"
                isDismissible={false}
                className={styles.securityNote}
              >
                {__(
                  'This file contains site credentials. Keep it safe!',
                  'wordforge',
                )}
              </Notice>

              <div style={{ marginTop: 16 }}>
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Spinner /> {__('Downloading...', 'wordforge')}
                    </>
                  ) : (
                    __('Download Config ZIP', 'wordforge')
                  )}
                </Button>
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  className={styles.advancedToggle}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  type="button"
                >
                  {showAdvanced
                    ? __('Hide Advanced Options', 'wordforge')
                    : __('Show Advanced Options', 'wordforge')}
                </button>

                {showAdvanced && (
                  <div className={styles.runtimeConfig}>
                    <SelectControl
                      label={__('JavaScript Runtime', 'wordforge')}
                      value={runtime}
                      options={[
                        { value: 'node', label: 'Node.js (Recommended)' },
                        { value: 'bun', label: 'Bun' },
                        { value: 'none', label: 'Remote Only' },
                      ]}
                      onChange={(val) => {
                        const newRuntime = val as RuntimePreference;
                        setRuntime(newRuntime);
                        saveSettings({ runtime: newRuntime });
                      }}
                      help={__(
                        'Select which runtime serves the local MCP server.',
                        'wordforge',
                      )}
                    />
                  </div>
                )}
              </div>

              <div className={styles.stepActions}>
                <CheckboxControl
                  label={__('I have downloaded the config', 'wordforge')}
                  checked={completedSteps.has(2)}
                  onChange={(checked) => {
                    if (checked) handleStepComplete(2);
                    else {
                      const next = new Set(completedSteps);
                      next.delete(2);
                      setCompletedSteps(next);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Extract */}
        <div
          className={`${styles.wizardStep} ${
            activeStep === 3 ? styles.wizardStepActive : ''
          } ${completedSteps.has(3) ? styles.wizardStepCompleted : ''}`}
        >
          <button
            className={`${styles.stepHeader} ${activeStep < 3 ? styles.stepHeaderDisabled : ''}`}
            onClick={() => handleStepClick(3)}
            type="button"
            style={{
              width: '100%',
              border: 'none',
              background: 'white',
              textAlign: 'left',
            }}
          >
            <div className={styles.stepIndicator}>
              {completedSteps.has(3) ? checkIcon : '3'}
            </div>
            <h3 className={styles.stepTitle}>
              {__('Extract Files', 'wordforge')}
            </h3>
            {completedSteps.has(3) && (
              <span className={styles.stepCheck}>✓</span>
            )}
          </button>

          {activeStep === 3 && (
            <div className={styles.stepBody}>
              <p className={styles.stepDescription}>{extractInstructions}</p>

              <div className={styles.stepActions}>
                <CheckboxControl
                  label={__('I have extracted the files', 'wordforge')}
                  checked={completedSteps.has(3)}
                  onChange={() => handleStepComplete(3)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Start */}
        <div
          className={`${styles.wizardStep} ${
            activeStep === 4 ? styles.wizardStepActive : ''
          } ${completedSteps.has(4) ? styles.wizardStepCompleted : ''}`}
        >
          <button
            className={`${styles.stepHeader} ${activeStep < 4 ? styles.stepHeaderDisabled : ''}`}
            onClick={() => handleStepClick(4)}
            type="button"
            style={{
              width: '100%',
              border: 'none',
              background: 'white',
              textAlign: 'left',
            }}
          >
            <div className={styles.stepIndicator}>
              {completedSteps.has(4) ? checkIcon : '4'}
            </div>
            <h3 className={styles.stepTitle}>
              {__('Start OpenCode', 'wordforge')}
            </h3>
            {completedSteps.has(4) && (
              <span className={styles.stepCheck}>✓</span>
            )}
          </button>

          {activeStep === 4 && (
            <div className={styles.stepBody}>
              <p className={styles.stepDescription}>
                {os === 'windows'
                  ? __(
                      'Open PowerShell (search in Start menu) and run:',
                      'wordforge',
                    )
                  : __('Open your Terminal and run:', 'wordforge')}
              </p>

              <div className={styles.codeBlock}>
                <div className={styles.codeContent}>{startCommand}</div>
                <ClipboardButton
                  className={styles.copyButton}
                  text={startCommand}
                  onCopy={() => {}}
                >
                  {__('Copy', 'wordforge')}
                </ClipboardButton>
              </div>

              <div className={styles.stepActions}>
                <Button
                  variant="primary"
                  onClick={checkServer}
                  isBusy={isCheckingServer}
                  disabled={isCheckingServer || localServerOnline === true}
                >
                  {localServerOnline
                    ? __('Connected!', 'wordforge')
                    : __('Test Connection', 'wordforge')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      <div
        className={`${styles.statusBanner} ${
          localServerOnline
            ? styles.statusBannerOnline
            : styles.statusBannerOffline
        }`}
      >
        <div className={styles.statusText}>
          <span className={styles.statusTitle}>
            {localServerOnline
              ? __('You are connected!', 'wordforge')
              : __('Waiting for connection...', 'wordforge')}
          </span>
          <span className={styles.statusSubtitle}>
            {localServerOnline
              ? `${__('OpenCode is running locally on port', 'wordforge')} ${port}`
              : __('Start OpenCode on your computer to connect', 'wordforge')}
          </span>
        </div>
        {!localServerOnline && (
          <Button
            variant="secondary"
            onClick={checkServer}
            isBusy={isCheckingServer}
          >
            {__('Check Again', 'wordforge')}
          </Button>
        )}
      </div>

      {/* Troubleshooting */}
      <div className={styles.troubleshooting}>
        <details>
          <summary
            style={{ cursor: 'pointer', color: 'var(--wf-color-primary)' }}
          >
            {__('Having trouble connecting?', 'wordforge')}
          </summary>
          <div className={styles.troubleDetails}>
            <ul className={styles.troubleList}>
              <li>
                <strong>{__('Check the port:', 'wordforge')}</strong>{' '}
                {__('Ensure OpenCode is running on port', 'wordforge')} {port}.{' '}
                <Button
                  variant="link"
                  onClick={() => {
                    const newPort = prompt(
                      __('Enter new port number:', 'wordforge'),
                      port,
                    );
                    if (newPort) {
                      setPort(newPort);
                      saveSettings({ port: Number.parseInt(newPort, 10) });
                    }
                  }}
                  isSmall
                >
                  {__('Change Port', 'wordforge')}
                </Button>
              </li>
              <li>
                <strong>{__('Check CORS:', 'wordforge')}</strong>{' '}
                {__(
                  'Make sure you include the --cors flag in your command.',
                  'wordforge',
                )}
              </li>
              <li>
                <strong>{__('Firewall:', 'wordforge')}</strong>{' '}
                {__(
                  'Ensure your firewall allows connections on the selected port.',
                  'wordforge',
                )}
              </li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};
