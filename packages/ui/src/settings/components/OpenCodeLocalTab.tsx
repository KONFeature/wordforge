import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CheckboxControl,
  ClipboardButton,
  ExternalLink,
  Icon,
  Notice,
  SelectControl,
  Spinner,
  TextControl,
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
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 0 0-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 0 0-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 0 1-.004-.021l-.004-.024a1.807 1.807 0 0 1-.15.706.953.953 0 0 1-.213.335.71.71 0 0 0-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 0 0-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 0 0-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 0 0-.205.334 1.18 1.18 0 0 0-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 0 1-.018-.2v-.02a1.772 1.772 0 0 1 .15-.768 1.08 1.08 0 0 1 .43-.533.985.985 0 0 1 .594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 0 0-.166-.267.248.248 0 0 0-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 0 0-.12.27.944.944 0 0 0-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 0 1-.131.068 2.62 2.62 0 0 1-.275-.402 1.772 1.772 0 0 1-.155-.667 1.759 1.759 0 0 1 .08-.668 1.43 1.43 0 0 1 .283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 0 1 .016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 0 1-.448-.067 3.566 3.566 0 0 1-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 0 0-.402-.533 1.45 1.45 0 0 0-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 0 0 .314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 0 1 .647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 0 1-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z" />
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
  const [showRuntimeOptions, setShowRuntimeOptions] = useState(false);
  const [showPortOptions, setShowPortOptions] = useState(false);
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
      {/* Intro Card */}
      <Card className="wordforge-card">
        <CardHeader>
          <h2>{__('Connect from Your Computer', 'wordforge')}</h2>
        </CardHeader>
        <CardBody>
          <p className={styles.introText}>
            {__(
              'Run OpenCode on your local machine and connect it to your WordPress site. This gives you faster performance, better privacy, and full access to your file system.',
              'wordforge',
            )}
          </p>
        </CardBody>
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

              <div className={styles.advancedSection}>
                <button
                  className={styles.advancedToggle}
                  onClick={() => setShowRuntimeOptions(!showRuntimeOptions)}
                  type="button"
                >
                  <Icon icon={showRuntimeOptions ? 'arrow-up' : 'arrow-down'} />
                  {__('Advanced Options', 'wordforge')}
                </button>

                {showRuntimeOptions && (
                  <div className={styles.advancedOptions}>
                    <SelectControl
                      label={__('JavaScript Runtime', 'wordforge')}
                      value={runtime}
                      options={[
                        { value: 'node', label: 'Node.js' },
                        { value: 'bun', label: 'Bun' },
                        {
                          value: 'none',
                          label: __('None (Remote only)', 'wordforge'),
                        },
                      ]}
                      onChange={(val) => {
                        const newRuntime = val as RuntimePreference;
                        setRuntime(newRuntime);
                        saveSettings({ runtime: newRuntime });
                      }}
                      help={__(
                        'The runtime used to run the local MCP server.',
                        'wordforge',
                      )}
                      disabled={isSaving}
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
              <div className={styles.terminalInstructions}>
                {os === 'mac' && (
                  <p className={styles.stepDescription}>
                    {__('Open Terminal using', 'wordforge')}{' '}
                    <kbd className={styles.kbd}>⌘</kbd>{' '}
                    <kbd className={styles.kbd}>Space</kbd>
                    {__(
                      ', type "Terminal", and press Enter. Then run:',
                      'wordforge',
                    )}
                  </p>
                )}
                {os === 'windows' && (
                  <p className={styles.stepDescription}>
                    {__('Press', 'wordforge')}{' '}
                    <kbd className={styles.kbd}>Win</kbd>{' '}
                    <kbd className={styles.kbd}>X</kbd>
                    {__(
                      ', select "Terminal" or "PowerShell". Then run:',
                      'wordforge',
                    )}
                  </p>
                )}
                {os === 'linux' && (
                  <p className={styles.stepDescription}>
                    {__('Open Terminal using', 'wordforge')}{' '}
                    <kbd className={styles.kbd}>Ctrl</kbd>{' '}
                    <kbd className={styles.kbd}>Alt</kbd>{' '}
                    <kbd className={styles.kbd}>T</kbd>
                    {__('. Then run:', 'wordforge')}
                  </p>
                )}
              </div>

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

              <p className={styles.enterHint}>
                {__('After pasting, press', 'wordforge')}{' '}
                <kbd className={styles.kbd}>Enter</kbd>{' '}
                {__('to run the command.', 'wordforge')}
              </p>

              <div className={styles.advancedSection}>
                <button
                  className={styles.advancedToggle}
                  onClick={() => setShowPortOptions(!showPortOptions)}
                  type="button"
                >
                  <Icon icon={showPortOptions ? 'arrow-up' : 'arrow-down'} />
                  {__('Advanced Options', 'wordforge')}
                </button>

                {showPortOptions && (
                  <div className={styles.advancedOptions}>
                    <TextControl
                      label={__('Server Port', 'wordforge')}
                      help={__(
                        'Change if port 4096 is already in use. The command above will update automatically.',
                        'wordforge',
                      )}
                      value={port}
                      onChange={handlePortChange}
                      onBlur={handlePortBlur}
                      type="number"
                      min={1024}
                      max={65535}
                      disabled={isSaving}
                    />
                  </div>
                )}
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
