import type { Model, Provider } from '@opencode-ai/sdk/client';
import { Button, Popover, TextControl } from '@wordpress/components';
import { memo, useCallback, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { isModelFree } from '../lib/filterModels';
import { sortProviders } from '../lib/providerHelpers';
import styles from './ModelSelector.module.css';

export interface SelectedModel {
  providerID: string;
  modelID: string;
}

interface ModelSelectorProps {
  providers: Provider[];
  selectedModel: SelectedModel | null;
  onSelectModel: (model: SelectedModel) => void;
  disabled?: boolean;
}

interface ProviderGroupProps {
  provider: Provider;
  isExpanded: boolean;
  onToggle: () => void;
  selectedModel: SelectedModel | null;
  onSelectModel: (providerID: string, modelID: string) => void;
  searchQuery: string;
}

const ModelButton = memo(
  ({
    model,
    modelID,
    isSelected,
    onClick,
  }: {
    model: Model;
    modelID: string;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    const isFree = isModelFree(model);

    return (
      <button
        type="button"
        onClick={onClick}
        className={`${styles.modelButton} ${isSelected ? styles.selected : ''}`}
        aria-pressed={isSelected}
      >
        <div className={styles.modelInfo}>
          <div className={styles.modelName}>
            {model.name}
            {isFree && (
              <span className={styles.freeBadge}>
                {__('free', 'wordforge')}
              </span>
            )}
          </div>
          <div className={styles.modelMeta}>
            {model.capabilities?.reasoning && <span title="Reasoning">🧠</span>}
            {model.capabilities?.toolcall && <span title="Tool calls">🔧</span>}
            {model.capabilities?.attachment && (
              <span title="Attachments">📎</span>
            )}
            {model.status !== 'active' && (
              <span
                className={
                  model.status === 'deprecated'
                    ? styles.statusDeprecated
                    : styles.statusPreview
                }
              >
                {model.status}
              </span>
            )}
          </div>
        </div>
        {isSelected && <span className={styles.checkmark}>✓</span>}
      </button>
    );
  },
);

const ProviderGroup = memo(
  ({
    provider,
    isExpanded,
    onToggle,
    selectedModel,
    onSelectModel,
    searchQuery,
  }: ProviderGroupProps) => {
    const models = useMemo(() => {
      const entries = Object.entries(provider.models || {});
      if (!searchQuery) return entries;
      return entries.filter(
        ([id, model]) =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          id.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }, [provider.models, searchQuery]);

    if (models.length === 0) return null;

    const hasSelectedModel = models.some(
      ([id]) =>
        selectedModel?.providerID === provider.id &&
        selectedModel?.modelID === id,
    );

    return (
      <div className={styles.providerGroup}>
        <button
          type="button"
          className={styles.providerHeader}
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <span className={styles.providerName}>
            {provider.name}
            <span className={styles.modelCount}>({models.length})</span>
          </span>
          {hasSelectedModel && <span className={styles.activeIndicator} />}
          <span className={styles.expandIcon}>{isExpanded ? '▾' : '▸'}</span>
        </button>

        {isExpanded && (
          <div className={styles.modelList}>
            {models.map(([modelID, model]) => (
              <ModelButton
                key={modelID}
                model={model}
                modelID={modelID}
                isSelected={
                  selectedModel?.providerID === provider.id &&
                  selectedModel?.modelID === modelID
                }
                onClick={() => onSelectModel(provider.id, modelID)}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

export const ModelSelector = ({
  providers,
  selectedModel,
  onSelectModel,
  disabled,
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    () => new Set(),
  );

  const sortedProviders = useMemo(() => {
    if (!Array.isArray(providers)) return [];
    return sortProviders(providers);
  }, [providers]);

  const getModelDisplayName = useCallback((): string => {
    if (!selectedModel) return __('Select Model', 'wordforge');
    if (!Array.isArray(providers)) return selectedModel.modelID;

    const provider = providers.find((p) => p.id === selectedModel.providerID);
    if (!provider) return selectedModel.modelID;

    const model = provider.models?.[selectedModel.modelID];
    return model
      ? `${provider.name} / ${model.name}`
      : `${provider.name} / ${selectedModel.modelID}`;
  }, [selectedModel, providers]);

  const toggleProvider = useCallback((providerId: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }, []);

  const handleSelectModel = useCallback(
    (providerID: string, modelID: string) => {
      onSelectModel({ providerID, modelID });
      setIsOpen(false);
      setSearchQuery('');
    },
    [onSelectModel],
  );

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (selectedModel) {
      setExpandedProviders(new Set([selectedModel.providerID]));
    } else if (sortedProviders.length > 0) {
      setExpandedProviders(new Set([sortedProviders[0].id]));
    }
  }, [selectedModel, sortedProviders]);

  const filteredProviders = useMemo(() => {
    if (!searchQuery) return sortedProviders;
    return sortedProviders.filter((provider) => {
      const models = Object.entries(provider.models || {});
      return models.some(
        ([id, model]) =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    });
  }, [sortedProviders, searchQuery]);

  const totalModels = useMemo(
    () =>
      sortedProviders.reduce(
        (acc, p) => acc + Object.keys(p.models || {}).length,
        0,
      ),
    [sortedProviders],
  );

  return (
    <div className={styles.root}>
      <Button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        disabled={disabled}
        size="small"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerIcon} aria-hidden="true">
          🤖
        </span>
        <span className={styles.triggerText}>{getModelDisplayName()}</span>
        <span className={styles.triggerArrow} aria-hidden="true">
          ▾
        </span>
      </Button>

      {isOpen && (
        <Popover
          position="top left"
          onClose={() => {
            setIsOpen(false);
            setSearchQuery('');
          }}
          focusOnMount="firstElement"
        >
          <div className={styles.popoverContent}>
            <div className={styles.searchContainer}>
              <TextControl
                placeholder={__('Search models...', 'wordforge')}
                value={searchQuery}
                onChange={setSearchQuery}
                className={styles.searchInput}
                __nextHasNoMarginBottom
              />
              <div className={styles.modelStats}>
                {totalModels} {__('models', 'wordforge')}
              </div>
            </div>

            <div className={styles.providerList}>
              {filteredProviders.length === 0 ? (
                <div className={styles.emptyState}>
                  {searchQuery
                    ? __('No models found', 'wordforge')
                    : __('No providers available', 'wordforge')}
                </div>
              ) : (
                filteredProviders.map((provider) => (
                  <ProviderGroup
                    key={provider.id}
                    provider={provider}
                    isExpanded={
                      expandedProviders.has(provider.id) || !!searchQuery
                    }
                    onToggle={() => toggleProvider(provider.id)}
                    selectedModel={selectedModel}
                    onSelectModel={handleSelectModel}
                    searchQuery={searchQuery}
                  />
                ))
              )}
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
};
