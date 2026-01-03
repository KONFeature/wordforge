import { useState } from 'react';

interface OnboardingProps {
  onConnect: (url: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function Onboarding({ onConnect, isLoading, error }: OnboardingProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConnect(url.trim());
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <h1>Welcome to WordForge</h1>
          <p>Connect your WordPress site to get started</p>
        </div>

        <div className="step-card">
          <div className="step-number">1</div>
          <div className="step-info">
            <h3>Install WordForge Plugin</h3>
            <p>
              Install and activate the WordForge plugin on your WordPress site.
            </p>
          </div>
        </div>

        <div className="step-card">
          <div className="step-number">2</div>
          <div className="step-info">
            <h3>Connect Desktop App</h3>
            <p>
              Go to WordForge → Settings → Local Connection and click "Open in
              Desktop App".
            </p>
          </div>
        </div>

        <div className="divider">
          <span>OR PASTE CONNECTION LINK</span>
        </div>

        <form onSubmit={handleSubmit} className="connection-form">
          <input
            type="text"
            className="input-field"
            placeholder="wordforge://connect?..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? 'Connecting...' : 'Connect Manually'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}
