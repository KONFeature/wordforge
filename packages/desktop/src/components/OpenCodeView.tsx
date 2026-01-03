import { ChevronLeft, ExternalLink, Square } from 'lucide-react';
import { useState } from 'react';
import type { UseOpenCodeReturn } from '../hooks/useOpenCode';

interface OpenCodeViewProps {
  opencode: UseOpenCodeReturn;
  siteName: string;
  onBack: () => void;
}

export function OpenCodeView({
  opencode,
  siteName,
  onBack,
}: OpenCodeViewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const port = opencode.port;

  if (!port) return null;

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
        {!isLoaded && (
          <div className="webview-loading">
            <div className="spinner" />
            <span>Connecting to OpenCode...</span>
          </div>
        )}
        <iframe
          src={`http://localhost:${port}`}
          className={`webview ${isLoaded ? 'visible' : ''}`}
          onLoad={() => setIsLoaded(true)}
          title="OpenCode Interface"
        />
      </div>
    </div>
  );
}
