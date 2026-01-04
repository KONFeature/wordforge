import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, Square } from 'lucide-react';
import { useState } from 'react';
import type { UseOpenCodeReturn } from '../hooks/useOpenCode';
import {
  buildOpenCodeUrl,
  createLocalClient,
} from '../hooks/useOpenCodeClient';

interface OpenCodeViewProps {
  opencode: UseOpenCodeReturn;
  siteName: string;
  projectDir: string;
  onBack: () => void;
}

export function OpenCodeView({
  opencode,
  siteName,
  projectDir,
  onBack,
}: OpenCodeViewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const port = opencode.port;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['opencode-init', port, projectDir],
    queryFn: async () => {
      if (!port) throw new Error('No port');

      const client = createLocalClient(port);

      const projectResult = await client.project.current({
        directory: projectDir,
      });
      const project = projectResult.data!;

      if (project.name !== siteName) {
        await client.project.update({
          projectID: project.id,
          name: siteName,
          directory: projectDir,
        });
      }

      const sessionsResult = await client.session.list({
        directory: projectDir,
      });
      const sessions = sessionsResult.data ?? [];

      let sessionId: string;
      if (sessions.length > 0) {
        sessionId = sessions[0].id;
      } else {
        const newSession = await client.session.create({
          directory: projectDir,
          title: `${siteName} Session`,
        });
        sessionId = newSession.data!.id;
      }

      return { projectId: project.id, sessionId };
    },
    enabled: !!port,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  if (!port) return null;

  const iframeUrl = data
    ? buildOpenCodeUrl(port, projectDir, data.sessionId)
    : null;

  return (
    <div className="opencode-view">
      <div className="opencode-toolbar">
        <div className="toolbar-left">
          <button type="button" className="btn-back" onClick={onBack}>
            <ChevronLeft size={16} />
            Back
          </button>
          <span className="toolbar-title">{siteName}</span>
        </div>
        <div className="toolbar-right">
          <button
            type="button"
            className="btn-icon"
            onClick={() => opencode.stop()}
            title="Stop Server"
          >
            <Square size={16} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => opencode.openView()}
            title="Open in Browser"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
      <div className="webview-container">
        {(isLoading || !isLoaded) && !isError && (
          <div className="webview-loading">
            <div className="spinner" />
            <span>
              {isLoading ? 'Initializing project...' : 'Loading OpenCode...'}
            </span>
          </div>
        )}
        {isError && (
          <div className="webview-loading">
            <span>Error: {error?.message}</span>
            <button type="button" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            className={`webview ${isLoaded ? 'visible' : ''}`}
            onLoad={() => setIsLoaded(true)}
            title="OpenCode Interface"
          />
        )}
      </div>
    </div>
  );
}
