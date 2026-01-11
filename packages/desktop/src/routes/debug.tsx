import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Folder,
  RefreshCw,
  Settings,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Toggle } from '../components/ui';
import { useSidebarNavItems } from '../context/SidebarContext';
import { useDebugMode } from '../hooks/useDebugMode';
import {
  useOpenCodeDebug,
  useOpenCodeLogContent,
} from '../hooks/useOpenCodeDebug';
import { useOpenCodeLogs } from '../hooks/useOpenCodeLogs';
import type { LogEntry, OpenCodeLogFile, OpenCodeStatus } from '../types';
import styles from './debug.module.css';

export const Route = createFileRoute('/debug')({
  component: DebugPage,
});

function DebugPage() {
  const { setNavItems } = useSidebarNavItems();
  const {
    debugInfo,
    logFiles,
    isLoading,
    refetch,
    refetchLogFiles,
    isRefetchingLogFiles,
  } = useOpenCodeDebug();
  const { logs, clearLogs, hasErrors } = useOpenCodeLogs();
  const [debugMode, setDebugMode] = useDebugMode();
  const [selectedLogFile, setSelectedLogFile] =
    useState<OpenCodeLogFile | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['status', 'settings', 'live-logs']),
  );

  useEffect(() => {
    setNavItems([]);
    return () => setNavItems([]);
  }, [setNavItems]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const formatStatus = (status: OpenCodeStatus): string => {
    if (typeof status === 'string') return status;
    return `error: ${status.error}`;
  };

  const getStatusVariant = (
    status: OpenCodeStatus,
  ): 'success' | 'warning' | 'error' | 'default' => {
    if (status === 'running') return 'success';
    if (status === 'starting') return 'warning';
    if (status === 'stopped' || status === 'not_installed') return 'default';
    return 'error';
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Debug</h1>
            <p className={styles.subtitle}>OpenCode diagnostics and logs</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
            Refresh
          </Button>
        </div>

        <Section
          id="status"
          title="Status"
          icon={<CheckCircle size={16} />}
          expanded={expandedSections.has('status')}
          onToggle={() => toggleSection('status')}
        >
          {debugInfo ? (
            <div className={styles.statusGrid}>
              <StatusItem
                label="Status"
                value={
                  <Badge variant={getStatusVariant(debugInfo.status)}>
                    {formatStatus(debugInfo.status)}
                  </Badge>
                }
              />
              <StatusItem
                label="Port"
                value={debugInfo.current_port?.toString() ?? 'Not running'}
              />
              <StatusItem
                label="Installed Version"
                value={debugInfo.installed_version ?? 'Not installed'}
              />
              <StatusItem
                label="Target Version"
                value={debugInfo.target_version}
              />
              <StatusItem
                label="Binary Exists"
                value={
                  <Badge
                    variant={debugInfo.binary_exists ? 'success' : 'error'}
                  >
                    {debugInfo.binary_exists ? 'Yes' : 'No'}
                  </Badge>
                }
              />
            </div>
          ) : (
            <p className={styles.loading}>Loading...</p>
          )}
        </Section>

        <Section
          id="settings"
          title="Settings"
          icon={<Settings size={16} />}
          expanded={expandedSections.has('settings')}
          onToggle={() => toggleSection('settings')}
        >
          <div className={styles.settingsContent}>
            <Toggle
              label="Debug Logging"
              description="Start OpenCode with --log-level DEBUG for verbose output"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            />
            <p className={styles.settingsNote}>
              Changes take effect on next OpenCode restart
            </p>
          </div>
        </Section>

        <Section
          id="paths"
          title="Paths"
          icon={<Folder size={16} />}
          expanded={expandedSections.has('paths')}
          onToggle={() => toggleSection('paths')}
        >
          {debugInfo ? (
            <div className={styles.pathsList}>
              <PathItem
                label="Install Directory"
                path={debugInfo.install_dir}
                onCopy={() => copyToClipboard(debugInfo.install_dir)}
              />
              <PathItem
                label="Binary Path"
                path={debugInfo.binary_path}
                onCopy={() => copyToClipboard(debugInfo.binary_path)}
              />
              <PathItem
                label="State Directory"
                path={debugInfo.state_dir}
                onCopy={() => copyToClipboard(debugInfo.state_dir)}
              />
              <PathItem
                label="Config Directory"
                path={debugInfo.config_dir}
                onCopy={() => copyToClipboard(debugInfo.config_dir)}
              />
              <PathItem
                label="Log Directory"
                path={debugInfo.log_dir}
                onCopy={() => copyToClipboard(debugInfo.log_dir)}
              />
              <PathItem
                label="Port File"
                path={debugInfo.port_file}
                onCopy={() => copyToClipboard(debugInfo.port_file)}
              />
              <PathItem
                label="Version File"
                path={debugInfo.version_file}
                onCopy={() => copyToClipboard(debugInfo.version_file)}
              />
            </div>
          ) : (
            <p className={styles.loading}>Loading...</p>
          )}
        </Section>

        <Section
          id="environment"
          title="Environment Variables"
          icon={<Terminal size={16} />}
          expanded={expandedSections.has('environment')}
          onToggle={() => toggleSection('environment')}
        >
          {debugInfo ? (
            <div className={styles.envList}>
              {debugInfo.environment.map(([key, value]) => (
                <div key={key} className={styles.envItem}>
                  <code className={styles.envKey}>{key}</code>
                  <code className={styles.envValue}>{value}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.loading}>Loading...</p>
          )}
        </Section>

        <Section
          id="live-logs"
          title="Live Logs"
          icon={<Terminal size={16} />}
          badge={
            hasErrors ? (
              <Badge variant="error">Errors</Badge>
            ) : logs.length > 0 ? (
              <Badge variant="default">{logs.length}</Badge>
            ) : null
          }
          expanded={expandedSections.has('live-logs')}
          onToggle={() => toggleSection('live-logs')}
          actions={
            <Button variant="ghost" size="sm" onClick={clearLogs}>
              <Trash2 size={12} />
              Clear
            </Button>
          }
        >
          <LiveLogsViewer logs={logs} />
        </Section>

        <Section
          id="log-files"
          title="Log Files"
          icon={<FileText size={16} />}
          badge={
            logFiles.length > 0 ? (
              <Badge variant="default">{logFiles.length}</Badge>
            ) : null
          }
          expanded={expandedSections.has('log-files')}
          onToggle={() => toggleSection('log-files')}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchLogFiles()}
              disabled={isRefetchingLogFiles}
            >
              <RefreshCw
                size={12}
                className={isRefetchingLogFiles ? styles.spinning : ''}
              />
              Refresh
            </Button>
          }
        >
          {logFiles.length > 0 ? (
            <div className={styles.logFilesContainer}>
              <div className={styles.logFilesList}>
                {logFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    className={`${styles.logFileItem} ${selectedLogFile?.path === file.path ? styles.selected : ''}`}
                    onClick={() => setSelectedLogFile(file)}
                  >
                    <FileText size={14} />
                    <span className={styles.logFileName}>{file.name}</span>
                    <span className={styles.logFileSize}>
                      {formatFileSize(file.size)}
                    </span>
                  </button>
                ))}
              </div>
              {selectedLogFile && <LogFileViewer file={selectedLogFile} />}
            </div>
          ) : (
            <p className={styles.emptyState}>No log files found</p>
          )}
        </Section>
      </div>
    </div>
  );
}

interface SectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function Section({
  title,
  icon,
  badge,
  expanded,
  onToggle,
  actions,
  children,
}: SectionProps) {
  return (
    <Card className={styles.section}>
      <button type="button" className={styles.sectionHeader} onClick={onToggle}>
        <div className={styles.sectionTitle}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {icon}
          <span>{title}</span>
          {badge}
        </div>
        {actions && (
          <div
            className={styles.sectionActions}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </button>
      {expanded && <div className={styles.sectionContent}>{children}</div>}
    </Card>
  );
}

function StatusItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={styles.statusItem}>
      <span className={styles.statusLabel}>{label}</span>
      <span className={styles.statusValue}>{value}</span>
    </div>
  );
}

function PathItem({
  label,
  path,
  onCopy,
}: {
  label: string;
  path: string;
  onCopy: () => void;
}) {
  return (
    <div className={styles.pathItem}>
      <span className={styles.pathLabel}>{label}</span>
      <div className={styles.pathValue}>
        <code>{path}</code>
        <button
          type="button"
          className={styles.copyButton}
          onClick={onCopy}
          title="Copy to clipboard"
        >
          <Copy size={12} />
        </button>
      </div>
    </div>
  );
}

function LiveLogsViewer({ logs }: { logs: LogEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  });

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  if (logs.length === 0) {
    return (
      <div className={styles.emptyLogs}>
        <Terminal size={24} className={styles.emptyIcon} />
        <p>No logs yet. Start OpenCode to see live output.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.logsContainer}
      onScroll={handleScroll}
    >
      {logs.map((log, index) => (
        <div
          key={`${log.timestamp}-${index}`}
          className={`${styles.logLine} ${log.level === 'stderr' ? styles.stderr : styles.stdout}`}
        >
          <span className={styles.logTimestamp}>
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          {log.level === 'stderr' ? (
            <XCircle size={12} className={styles.logIcon} />
          ) : (
            <AlertCircle size={12} className={styles.logIcon} />
          )}
          <span className={styles.logMessage}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

function LogFileViewer({ file }: { file: OpenCodeLogFile }) {
  const { data: content, isLoading } = useOpenCodeLogContent(file.path, 200);

  return (
    <div className={styles.logFileViewer}>
      <div className={styles.logFileHeader}>
        <span>{file.name}</span>
        <span className={styles.logFileMeta}>
          {formatFileSize(file.size)}
          {file.modified && ` • ${formatDate(file.modified)}`}
        </span>
      </div>
      <div className={styles.logFileContent}>
        {isLoading ? (
          <p className={styles.loading}>Loading...</p>
        ) : content ? (
          <pre>{content}</pre>
        ) : (
          <p className={styles.emptyState}>Empty file</p>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}
