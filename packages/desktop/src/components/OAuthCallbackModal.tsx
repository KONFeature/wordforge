import type { ProviderAuthAuthorization } from '@opencode-ai/sdk/v2/client';
import { Copy, ExternalLink, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { OAuthProvider } from '../lib/oauth-providers';
import styles from './OAuthCallbackModal.module.css';

interface OAuthCallbackModalProps {
  provider: OAuthProvider;
  authorization: ProviderAuthAuthorization;
  onSubmitCode: (code: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function OAuthCallbackModal({
  provider,
  authorization,
  onSubmitCode,
  onCancel,
  isSubmitting,
}: OAuthCallbackModalProps) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isAutoMethod = authorization.method === 'auto';
  const confirmationCode = authorization.instructions?.includes(':')
    ? authorization.instructions.split(':')[1]?.trim()
    : authorization.instructions;

  useEffect(() => {
    dialogRef.current?.showModal();
    if (!isAutoMethod && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAutoMethod]);

  const handleCopyCode = async () => {
    if (confirmationCode) {
      await navigator.clipboard.writeText(confirmationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmitCode(code.trim());
    }
  };

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleDialogClick}
      onKeyDown={handleKeyDown}
      onClose={onCancel}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Sign in to {provider.name}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.content}>
          {isAutoMethod ? (
            <>
              <p className={styles.instructions}>
                Enter this code in your browser to complete sign in:
              </p>
              <div className={styles.codeDisplay}>
                <code className={styles.confirmationCode}>
                  {confirmationCode}
                </code>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={handleCopyCode}
                >
                  <Copy size={14} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className={styles.waitingState}>
                <Loader2 size={16} className={styles.spinner} />
                <span>Waiting for authorization...</span>
              </div>
              <a
                href={authorization.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.openLink}
              >
                <ExternalLink size={14} />
                Open authorization page
              </a>
            </>
          ) : (
            <>
              <p className={styles.instructions}>
                Complete authorization in your browser, then enter the code
                below:
              </p>
              <form onSubmit={handleSubmit} className={styles.form}>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.codeInput}
                  placeholder="Enter authorization code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={!code.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className={styles.spinner} />
                      Verifying...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </form>
              <a
                href={authorization.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.openLink}
              >
                <ExternalLink size={14} />
                Open authorization page again
              </a>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
