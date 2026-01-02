import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ExternalLink,
  Notice,
  SelectControl,
  Spinner,
  TextControl,
} from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { ProviderDisplayInfo } from '../../types';
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

interface ConfiguredProviderItemProps {
  provider: ProviderDisplayInfo;
  onEdit: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}

const ConfiguredProviderItem = ({
  provider,
  onEdit,
  onRemove,
  isRemoving,
}: ConfiguredProviderItemProps) => (
  <div className={styles.configuredItem}>
    <div className={styles.configuredInfo}>
      <span className={styles.providerName}>{provider.name}</span>
      <code className={styles.maskedKey}>{provider.apiKeyMasked}</code>
    </div>
    <div className={styles.actions}>
      <Button variant="secondary" size="small" onClick={onEdit}>
        {__('Change', 'wordforge')}
      </Button>
      <Button
        variant="secondary"
        size="small"
        isDestructive
        onClick={onRemove}
        isBusy={isRemoving}
      >
        {__('Remove', 'wordforge')}
      </Button>
    </div>
  </div>
);

interface AddProviderFormProps {
  availableProviders: ProviderDisplayInfo[];
  onSave: (providerId: string, apiKey: string) => Promise<void>;
  isSaving: boolean;
  savingProviderId: string | null;
}

const AddProviderForm = ({
  availableProviders,
  onSave,
  isSaving,
  savingProviderId,
}: AddProviderFormProps) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const selectedProvider = useMemo(
    () => availableProviders.find((p) => p.id === selectedProviderId),
    [availableProviders, selectedProviderId],
  );

  const providerOptions = useMemo(
    () => [
      { value: '', label: __('Select a provider...', 'wordforge') },
      ...availableProviders.map((p) => ({
        value: p.id,
        label: p.hasFreeModels
          ? `${p.name} (${__('free models available', 'wordforge')})`
          : p.name,
      })),
    ],
    [availableProviders],
  );

  const handleSave = async () => {
    if (!selectedProviderId || !apiKey) return;
    await onSave(selectedProviderId, apiKey);
    setSelectedProviderId('');
    setApiKey('');
    setShowKey(false);
  };

  const handleCancel = () => {
    setSelectedProviderId('');
    setApiKey('');
    setShowKey(false);
  };

  if (availableProviders.length === 0) {
    return (
      <p className={styles.allConfigured}>
        {__('All known providers are configured.', 'wordforge')}
      </p>
    );
  }

  return (
    <div className={styles.addProviderForm}>
      <SelectControl
        label={__('Provider', 'wordforge')}
        value={selectedProviderId}
        options={providerOptions}
        onChange={setSelectedProviderId}
        className={styles.providerSelect}
      />

      {selectedProvider && (
        <div className={styles.providerConfig}>
          {selectedProvider.helpUrl && (
            <div className={styles.helpRow}>
              <ExternalLink href={selectedProvider.helpUrl}>
                {__('Get API Key', 'wordforge')}
              </ExternalLink>
              {selectedProvider.helpText && (
                <span className={styles.helpText}>
                  {selectedProvider.helpText}
                </span>
              )}
            </div>
          )}

          <div className={styles.inputWrapper}>
            <TextControl
              label={__('API Key', 'wordforge')}
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={setApiKey}
              placeholder={selectedProvider.placeholder || 'Enter API key...'}
              className={styles.apiKeyInput}
            />
            <Button
              icon={showKey ? 'hidden' : 'visibility'}
              onClick={() => setShowKey(!showKey)}
              className={styles.toggleVisibility}
              label={
                showKey ? __('Hide', 'wordforge') : __('Show', 'wordforge')
              }
            />
          </div>

          <div className={styles.formActions}>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!apiKey}
              isBusy={isSaving && savingProviderId === selectedProviderId}
            >
              {__('Save Provider', 'wordforge')}
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              {__('Cancel', 'wordforge')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface EditProviderFormProps {
  provider: ProviderDisplayInfo;
  onSave: (apiKey: string) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const EditProviderForm = ({
  provider,
  onSave,
  onCancel,
  isSaving,
}: EditProviderFormProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = async () => {
    if (!apiKey) return;
    await onSave(apiKey);
  };

  return (
    <div className={styles.editForm}>
      <div className={styles.editHeader}>
        <span className={styles.providerName}>{provider.name}</span>
        {provider.helpUrl && (
          <ExternalLink href={provider.helpUrl}>
            {__('Get API Key', 'wordforge')}
          </ExternalLink>
        )}
      </div>

      <div className={styles.inputWrapper}>
        <TextControl
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={setApiKey}
          placeholder={provider.placeholder || 'Enter new API key...'}
          className={styles.apiKeyInput}
        />
        <Button
          icon={showKey ? 'hidden' : 'visibility'}
          onClick={() => setShowKey(!showKey)}
          className={styles.toggleVisibility}
          label={showKey ? __('Hide', 'wordforge') : __('Show', 'wordforge')}
        />
      </div>

      <div className={styles.formActions}>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!apiKey}
          isBusy={isSaving}
        >
          {__('Update', 'wordforge')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {__('Cancel', 'wordforge')}
        </Button>
      </div>
    </div>
  );
};

export const ProvidersCard = ({ restUrl, nonce }: ProvidersCardProps) => {
  const { data, isLoading } = useProviders(restUrl, nonce);
  const saveProvider = useSaveProvider(restUrl, nonce);
  const removeProvider = useRemoveProvider(restUrl, nonce);

  const [editingProviderId, setEditingProviderId] = useState<string | null>(
    null,
  );

  const providers = data?.providers ?? [];

  const { configuredProviders, availableProviders } = useMemo(() => {
    const configured = providers.filter((p) => p.configured);
    const available = providers.filter((p) => !p.configured);
    return { configuredProviders: configured, availableProviders: available };
  }, [providers]);

  const editingProvider = useMemo(
    () => providers.find((p) => p.id === editingProviderId),
    [providers, editingProviderId],
  );

  const handleSaveNew = async (providerId: string, apiKey: string) => {
    await saveProvider.mutateAsync({ providerId, apiKey });
  };

  const handleSaveEdit = async (apiKey: string) => {
    if (!editingProviderId) return;
    await saveProvider.mutateAsync({ providerId: editingProviderId, apiKey });
    setEditingProviderId(null);
  };

  const handleRemove = (providerId: string) => {
    removeProvider.mutate(providerId);
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
            'Configure API keys to enable AI models from different providers.',
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
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {__('Configured Providers', 'wordforge')}
              </h3>

              {configuredProviders.length === 0 ? (
                <p className={styles.emptyState}>
                  {__('No providers configured yet.', 'wordforge')}
                </p>
              ) : (
                <div className={styles.configuredList}>
                  {configuredProviders.map((provider) =>
                    editingProviderId === provider.id && editingProvider ? (
                      <EditProviderForm
                        key={provider.id}
                        provider={editingProvider}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditingProviderId(null)}
                        isSaving={saveProvider.isPending}
                      />
                    ) : (
                      <ConfiguredProviderItem
                        key={provider.id}
                        provider={provider}
                        onEdit={() => setEditingProviderId(provider.id)}
                        onRemove={() => handleRemove(provider.id)}
                        isRemoving={
                          removeProvider.isPending &&
                          removeProvider.variables === provider.id
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {__('Add Provider', 'wordforge')}
              </h3>
              <AddProviderForm
                availableProviders={availableProviders}
                onSave={handleSaveNew}
                isSaving={saveProvider.isPending}
                savingProviderId={saveProvider.variables?.providerId ?? null}
              />
            </div>
          </>
        )}

        <div className={styles.zenNote}>
          <strong>{__('OpenCode Zen', 'wordforge')}</strong>
          <p>
            {__(
              'Free models are always available without an API key.',
              'wordforge',
            )}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
