import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, Square } from 'lucide-react';
import { useState } from 'react';
import { useOpenCodeClientSafe } from '../context/OpenCodeClientContext';
import { useOpenCodeActions } from '../hooks/useOpenCode';

interface OpenCodeViewProps {
  siteName: string;
  onBack: () => void;
}

export function OpenCodeView({ siteName, onBack }: OpenCodeViewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const clientContext = useOpenCodeClientSafe();
  const { stop } = useOpenCodeActions();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['opencode-init', clientContext?.projectDir],
    queryFn: async () => {
      if (!clientContext) throw new Error('Server not running');

      const { client } = clientContext;
      const projectResult = await client.project.current();
      const project = projectResult.data!;

      if (project.name !== siteName) {
        await client.project.update({
          projectID: project.id,
          name: siteName,
        });
      }

      const sessionsResult = await client.session.list();
      const sessions = sessionsResult.data ?? [];

      let sessionId: string;
      if (sessions.length > 0) {
        sessionId = sessions[0].id;
      } else {
        const newSession = await client.session.create({
          title: `${siteName} Session`,
        });
        sessionId = newSession.data!.id;
      }

      return { projectId: project.id, sessionId };
    },
    enabled: !!clientContext,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const iframeUrl =
    data && clientContext ? clientContext.buildUrl(data.sessionId) : null;

  if (!clientContext) {
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
        </div>
        <div className="webview-container">
          <div className="webview-loading">
            <span>OpenCode server is not running. Please start it first.</span>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => stop()}
            title="Stop Server"
          >
            <Square size={16} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => data && clientContext.openInWebview(data.sessionId)}
            title="Open in Browser"
            disabled={!data}
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
