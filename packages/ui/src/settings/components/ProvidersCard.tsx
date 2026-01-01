import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ExternalLink,
  Notice,
  Spinner,
  TextControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
  useProviders,
  useRemoveProvider,
  useSaveProvider,
} from '../hooks/useProviders';
import styles from './ProvidersCard.module.css';

interface ProvidersCardProps {
  restUrl: string;
  nonce: string;
}

export const ProvidersCard = ({ restUrl, nonce }: ProvidersCardProps) => {
  const { data, isLoading } = useProviders(restUrl, nonce);
  const saveProvider = useSaveProvider(restUrl, nonce);
  const removeProvider = useRemoveProvider(restUrl, nonce);

  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const providers = data?.providers ?? [];

  const handleSave = async (providerId: string) => {
    const apiKey = apiKeyInputs[providerId];
    if (!apiKey) return;

    await saveProvider
      .mutateAsync({ providerId, apiKey })
      .then(() => {
        setEditingProvider(null);
        setApiKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
      })
      .catch(() => {});
  };

  const handleRemove = (providerId: string) => {
    removeProvider.mutate(providerId);
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const error = saveProvider.error || removeProvider.error;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <Card className="wordforge-card">
      <CardHeader>
        <h2>{__('AI Providers', 'wordforge')}</h2>
      </CardHeader>
      <CardBody>
        <p className={styles.description}>
          {__(
            'Configure API keys to use models from these providers. OpenCode Zen (free) is always available.',
            'wordforge',
          )}
        </p>

        {errorMessage && (
          <Notice
            status="error"
            onRemove={() => {
              saveProvider.reset();
              removeProvider.reset();
            }}
            isDismissible
          >
            {errorMessage}
          </Notice>
        )}

        {isLoading ? (
          <div className={styles.loading}>
            <Spinner />
          </div>
        ) : (
          <div className={styles.providersList}>
            {providers.map((provider) => (
              <div key={provider.id} className={styles.providerItem}>
                <div className={styles.providerHeader}>
                  <div className={styles.providerInfo}>
                    <span className={styles.providerName}>{provider.name}</span>
                    {provider.configured ? (
                      <span className={`${styles.badge} ${styles.configured}`}>
                        {__('Configured', 'wordforge')}
                      </span>
                    ) : (
                      <span
                        className={`${styles.badge} ${styles.notConfigured}`}
                      >
                        {__('Not configured', 'wordforge')}
                      </span>
                    )}
                  </div>
                  {provider.helpUrl && (
                    <ExternalLink
                      href={provider.helpUrl}
                      className={styles.helpLink}
                    >
                      {__('Get API Key', 'wordforge')}
                    </ExternalLink>
                  )}
                </div>

                {provider.configured && editingProvider !== provider.id ? (
                  <div className={styles.configuredState}>
                    <code className={styles.maskedKey}>
                      {provider.apiKeyMasked}
                    </code>
                    <div className={styles.actions}>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setEditingProvider(provider.id)}
                      >
                        {__('Change', 'wordforge')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        isDestructive
                        onClick={() => handleRemove(provider.id)}
                        isBusy={
                          removeProvider.isPending &&
                          removeProvider.variables === provider.id
                        }
                      >
                        {__('Remove', 'wordforge')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.inputState}>
                    <div className={styles.inputWrapper}>
                      <TextControl
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={apiKeyInputs[provider.id] || ''}
                        onChange={(value) =>
                          setApiKeyInputs((prev) => ({
                            ...prev,
                            [provider.id]: value,
                          }))
                        }
                        placeholder={provider.placeholder || 'API key...'}
                        className={styles.apiKeyInput}
                      />
                      <Button
                        icon={showKeys[provider.id] ? 'hidden' : 'visibility'}
                        onClick={() => toggleShowKey(provider.id)}
                        className={styles.toggleVisibility}
                        label={
                          showKeys[provider.id]
                            ? __('Hide', 'wordforge')
                            : __('Show', 'wordforge')
                        }
                      />
                    </div>
                    <div className={styles.actions}>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleSave(provider.id)}
                        disabled={!apiKeyInputs[provider.id]}
                        isBusy={
                          saveProvider.isPending &&
                          saveProvider.variables?.providerId === provider.id
                        }
                      >
                        {__('Save', 'wordforge')}
                      </Button>
                      {editingProvider === provider.id && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setEditingProvider(null);
                            setApiKeyInputs((prev) => ({
                              ...prev,
                              [provider.id]: '',
                            }));
                          }}
                        >
                          {__('Cancel', 'wordforge')}
                        </Button>
                      )}
                    </div>
                    {provider.helpText && (
                      <p className={styles.helpText}>{provider.helpText}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.zenNote}>
          <strong>{__('OpenCode Zen', 'wordforge')}</strong>
          <p>
            {__(
              'Free models like Big Pickle and GPT-5 Nano are always available without an API key.',
              'wordforge',
            )}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
