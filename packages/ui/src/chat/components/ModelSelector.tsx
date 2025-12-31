import type { Model, Provider } from '@opencode-ai/sdk/client';
import { Button, Popover } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

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
    <div style={{ position: 'relative' }}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        isSmall
        style={{
          fontSize: '11px',
          padding: '2px 8px',
          background: '#f0f0f1',
          border: '1px solid #c3c4c7',
          borderRadius: '3px',
        }}
      >
        <span style={{ marginRight: '4px' }}>🤖</span>
        {getModelDisplayName()}
        <span style={{ marginLeft: '4px', opacity: 0.6 }}>▾</span>
      </Button>

      {isOpen && (
        <Popover
          position="top left"
          onClose={() => setIsOpen(false)}
          focusOnMount={false}
        >
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              minWidth: '250px',
              padding: '8px 0',
            }}
          >
            {!Array.isArray(providers) || providers.length === 0 ? (
              <div
                style={{
                  padding: '12px 16px',
                  color: '#646970',
                  fontSize: '12px',
                }}
              >
                {__('No providers available', 'wordforge')}
              </div>
            ) : (
              providers.map((provider) => {
                const models = Object.entries(provider.models || {});
                if (models.length === 0) return null;

                return (
                  <div key={provider.id}>
                    <div
                      style={{
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#646970',
                        textTransform: 'uppercase',
                        background: '#f6f7f7',
                      }}
                    >
                      {provider.name}
                    </div>
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
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            border: 'none',
                            background: isSelected ? '#f0f6fc' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{model.name}</div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#646970',
                              marginTop: '2px',
                            }}
                          >
                            {model.capabilities.reasoning && '🧠 '}
                            {model.capabilities.toolcall && '🔧 '}
                            {model.capabilities.attachment && '📎 '}
                            {model.status !== 'active' && (
                              <span
                                style={{
                                  marginLeft: '4px',
                                  padding: '1px 4px',
                                  background:
                                    model.status === 'deprecated'
                                      ? '#f8d7da'
                                      : '#fff3cd',
                                  borderRadius: '2px',
                                  fontSize: '9px',
                                }}
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
