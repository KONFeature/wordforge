import { AlertTriangle, Check, ExternalLink, Loader2 } from 'lucide-react';
import type { OAuthLoginState } from '../hooks/useOAuthLogin';
import type { OAuthProvider } from '../lib/oauth-providers';
import styles from './OAuthProviderCard.module.css';

interface OAuthProviderCardProps {
  provider: OAuthProvider;
  state: OAuthLoginState;
  isActive: boolean;
  onSignIn: () => void;
}

function getStatusMessage(state: OAuthLoginState): string | null {
  switch (state.status) {
    case 'enabling-plugin':
      return 'Enabling plugin...';
    case 'restarting':
      return 'Restarting server...';
    case 'waiting-for-server':
      return 'Starting server...';
    case 'fetching-auth-methods':
      return 'Preparing...';
    case 'authorizing':
      return 'Authorizing...';
    case 'waiting-for-callback':
      return 'Complete in browser...';
    default:
      return null;
  }
}

export function OAuthProviderCard({
  provider,
  state,
  isActive,
  onSignIn,
}: OAuthProviderCardProps) {
  const isLoading =
    isActive &&
    state.status !== 'idle' &&
    state.status !== 'success' &&
    state.status !== 'error';
  const isSuccess = isActive && state.status === 'success';
  const isError = isActive && state.status === 'error';
  const statusMessage = isActive ? getStatusMessage(state) : null;

  return (
    <div
      className={`${styles.card} ${provider.experimental ? styles.experimental : ''}`}
      style={{ '--provider-color': provider.color } as React.CSSProperties}
    >
      <div className={styles.header}>
        <div
          className={styles.iconWrapper}
          style={{ backgroundColor: provider.color }}
        >
          <span className={styles.iconLetter}>{provider.name[0]}</span>
        </div>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{provider.name}</span>
            {provider.experimental && (
              <span className={styles.experimentalBadge}>
                <AlertTriangle size={10} />
                Unstable
              </span>
            )}
          </div>
          <span className={styles.description}>{provider.description}</span>
        </div>
      </div>

      <div className={styles.actions}>
        {isSuccess ? (
          <div className={styles.successState}>
            <Check size={16} />
            <span>Connected</span>
          </div>
        ) : isError ? (
          <button
            type="button"
            className={styles.signInButton}
            onClick={onSignIn}
          >
            Retry
          </button>
        ) : (
          <button
            type="button"
            className={styles.signInButton}
            onClick={onSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className={styles.spinner} />
                <span>{statusMessage}</span>
              </>
            ) : (
              <>
                <ExternalLink size={14} />
                <span>Sign In</span>
              </>
            )}
          </button>
        )}
      </div>

      {isError && state.status === 'error' && (
        <div className={styles.errorMessage}>{state.message}</div>
      )}
    </div>
  );
}
