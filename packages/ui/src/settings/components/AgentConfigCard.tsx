import type { Provider } from '@opencode-ai/sdk/client';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Notice,
  Spinner,
} from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
  ModelSelector,
  type SelectedModel,
} from '../../components/ModelSelector';
import type { AgentInfo } from '../../types';
import {
  useAgents,
  useOpenCodeConfiguredProviders,
  useResetAgents,
  useSaveAgents,
} from '../hooks/useAgentConfig';
import styles from './AgentConfigCard.module.css';

interface AgentConfigCardProps {
  restUrl: string;
  nonce: string;
  initialAgents: AgentInfo[];
  serverRunning: boolean;
  onStartServer: () => void;
}

const parseModelString = (modelString: string): SelectedModel | null => {
  const parts = modelString.split('/');
  if (parts.length < 2) return null;
  return {
    providerID: parts[0],
    modelID: parts.slice(1).join('/'),
  };
};

const toModelString = (model: SelectedModel): string => {
  return `${model.providerID}/${model.modelID}`;
};

const isModelRecommended = (
  modelValue: string,
  recommendations: string[],
): boolean => {
  for (const rec of recommendations) {
    if (modelValue === rec) return true;
    if (modelValue.startsWith(rec)) return true;
    if (rec.startsWith(modelValue)) return true;
  }
  return false;
};

const hasAnyModels = (providers: Provider[] | undefined): boolean => {
  if (!providers) return false;
  return providers.some((p) => p.models && Object.keys(p.models).length > 0);
};

export const AgentConfigCard = ({
  restUrl,
  nonce,
  initialAgents,
  serverRunning,
  onStartServer,
}: AgentConfigCardProps) => {
  const { data: agentsData, isLoading: agentsLoading } = useAgents(
    restUrl,
    nonce,
  );
  const { data: providers, isLoading: providersLoading } =
    useOpenCodeConfiguredProviders();
  const saveAgents = useSaveAgents(restUrl, nonce);
  const resetAgents = useResetAgents(restUrl, nonce);

  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>(
    {},
  );

  const agents = agentsData?.agents ?? initialAgents;
  const isLoading = agentsLoading || providersLoading;

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleModelChange = (agentId: string, model: SelectedModel) => {
    const modelString = toModelString(model);
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    if (modelString === agent.effectiveModel && !agent.currentModel) {
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
    } else {
      setPendingChanges((prev) => ({ ...prev, [agentId]: modelString }));
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    const models: Record<string, string> = {};
    for (const agent of agents) {
      const newModel = pendingChanges[agent.id];
      if (newModel) {
        models[agent.id] = newModel;
      } else if (agent.currentModel) {
        models[agent.id] = agent.currentModel;
      }
    }

    await saveAgents
      .mutateAsync(models)
      .then(() => {
        setPendingChanges({});
      })
      .catch(() => {});
  };

  const handleReset = async () => {
    await resetAgents
      .mutateAsync()
      .then(() => {
        setPendingChanges({});
      })
      .catch(() => {});
  };

  const error = saveAgents.error || resetAgents.error;
  const errorMessage = error instanceof Error ? error.message : null;
  const noProviders = !isLoading && !hasAnyModels(providers);

  return (
    <Card className="wordforge-card">
      <CardHeader>
        <h2>{__('Agent Models', 'wordforge')}</h2>
      </CardHeader>
      <CardBody>
        <p className={styles.description}>
          {__(
            'Configure which AI model each agent uses. Changes will restart the OpenCode server.',
            'wordforge',
          )}
        </p>

        {errorMessage && (
          <Notice
            status="error"
            onRemove={() => {
              saveAgents.reset();
              resetAgents.reset();
            }}
            isDismissible
          >
            {errorMessage}
          </Notice>
        )}

        {!serverRunning ? (
          <div className={styles.serverStopped}>
            <p>
              {__(
                'Start the OpenCode server to configure which AI models each agent uses.',
                'wordforge',
              )}
            </p>
            <Button
              variant="primary"
              onClick={onStartServer}
              icon="controls-play"
            >
              {__('Start Server', 'wordforge')}
            </Button>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>
            <Spinner />
          </div>
        ) : noProviders ? (
          <div className={styles.noProviders}>
            <p>
              {__(
                'No models available. Configure at least one AI provider above to see available models.',
                'wordforge',
              )}
            </p>
          </div>
        ) : (
          <div className={styles.agentsList}>
            {agents.map((agent) => {
              const currentModelString =
                pendingChanges[agent.id] ?? agent.effectiveModel;
              const currentModel = parseModelString(currentModelString);
              const isRecommended = isModelRecommended(
                currentModelString,
                agent.recommendations ?? [],
              );

              return (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  providers={providers ?? []}
                  currentModel={currentModel}
                  isRecommended={isRecommended}
                  onModelChange={(model) =>
                    model && handleModelChange(agent.id, model)
                  }
                />
              );
            })}
          </div>
        )}

        {serverRunning && !noProviders && (
          <>
            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges}
                isBusy={saveAgents.isPending}
              >
                {__('Save Changes', 'wordforge')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleReset}
                isBusy={resetAgents.isPending}
              >
                {__('Reset to Recommended', 'wordforge')}
              </Button>
            </div>

            {hasChanges && (
              <p className={styles.pendingNote}>
                {__('You have unsaved changes.', 'wordforge')}
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

interface AgentItemProps {
  agent: AgentInfo;
  providers: Provider[];
  currentModel: SelectedModel | null;
  isRecommended: boolean;
  onModelChange: (model: SelectedModel | null) => void;
}

const AgentItem = ({
  agent,
  providers,
  currentModel,
  isRecommended,
  onModelChange,
}: AgentItemProps) => {
  return (
    <div className={styles.agentItem}>
      <div className={styles.agentHeader}>
        <div
          className={styles.agentColor}
          style={{ backgroundColor: agent.color }}
        />
        <div className={styles.agentInfo}>
          <span className={styles.agentName}>{agent.name}</span>
          <span className={styles.agentDescription}>{agent.description}</span>
        </div>
      </div>

      <div className={styles.modelSelector}>
        <ModelSelector
          providers={providers}
          selectedModel={currentModel}
          onSelectModel={onModelChange}
        />
        {isRecommended && (
          <span className={styles.recommendedBadge}>
            {__('Recommended', 'wordforge')}
          </span>
        )}
      </div>
    </div>
  );
};
