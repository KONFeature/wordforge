import type { Model, Provider } from '@opencode-ai/sdk/client';
import { Button, Popover } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
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

export const ModelSelector = ({
  providers,
  selectedModel,
  onSelectModel,
  disabled,
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getModelDisplayName = (): string => {
    if (!selectedModel) return __('Select Model', 'wordforge');
    if (!Array.isArray(providers)) return selectedModel.modelID;

    const provider = providers.find((p) => p.id === selectedModel.providerID);
    if (!provider) return selectedModel.modelID;

    const model = provider.models?.[selectedModel.modelID];
    return model
      ? `${provider.name} / ${model.name}`
      : `${provider.name} / ${selectedModel.modelID}`;
  };

  const handleSelectModel = (providerID: string, modelID: string) => {
    onSelectModel({ providerID, modelID });
    setIsOpen(false);
  };

  return (
    <div className={styles.root}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        size="small"
        className={styles.trigger}
      >
        <span className={styles.triggerIcon}>🤖</span>
        {getModelDisplayName()}
        <span className={styles.triggerArrow}>▾</span>
      </Button>

      {isOpen && (
        <Popover
          position="top left"
          onClose={() => setIsOpen(false)}
          focusOnMount={false}
        >
          <div className={styles.popoverContent}>
            {!Array.isArray(providers) || providers.length === 0 ? (
              <div className={styles.emptyState}>
                {__('No providers available', 'wordforge')}
              </div>
            ) : (
              providers.map((provider) => {
                const models = Object.entries(provider.models || {});
                if (models.length === 0) return null;

                return (
                  <div key={provider.id}>
                    <div className={styles.providerHeader}>{provider.name}</div>
                    {models.map(([modelID, model]) => {
                      const isSelected =
                        selectedModel?.providerID === provider.id &&
                        selectedModel?.modelID === modelID;
                      return (
                        <button
                          type="button"
                          key={modelID}
                          onClick={() =>
                            handleSelectModel(provider.id, modelID)
                          }
                          className={`${styles.modelButton} ${isSelected ? styles.selected : ''}`}
                        >
                          <div className={styles.modelName}>{model.name}</div>
                          <div className={styles.modelId}>
                            {model.capabilities.reasoning && '🧠 '}
                            {model.capabilities.toolcall && '🔧 '}
                            {model.capabilities.attachment && '📎 '}
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
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </Popover>
      )}
    </div>
  );
};
