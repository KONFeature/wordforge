import type { Provider } from '@opencode-ai/sdk/client';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Notice,
  SelectControl,
  Spinner,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { AgentInfo } from '../../types';
import {
  useAgents,
  useOpenCodeProviders,
  useResetAgents,
  useSaveAgents,
} from '../hooks/useAgentConfig';
import styles from './AgentConfigCard.module.css';

interface AgentConfigCardProps {
  restUrl: string;
  nonce: string;
  initialAgents: AgentInfo[];
}

export const AgentConfigCard = ({
  restUrl,
  nonce,
  initialAgents,
}: AgentConfigCardProps) => {
  const { data: agentsData, isLoading: agentsLoading } = useAgents(
    restUrl,
    nonce,
  );
  const { data: providers, isLoading: providersLoading } = useOpenCodeProviders(
    restUrl,
    nonce,
  );
  const saveAgents = useSaveAgents(restUrl, nonce);
  const resetAgents = useResetAgents(restUrl, nonce);

  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>(
    {},
  );

  const agents = agentsData?.agents ?? initialAgents;
  const isLoading = agentsLoading || providersLoading;

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleModelChange = (agentId: string, modelId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    if (modelId === agent.effectiveModel && !agent.currentModel) {
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
    } else {
      setPendingChanges((prev) => ({ ...prev, [agentId]: modelId }));
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

  const getModelOptions = (
    providerList: Provider[] | undefined,
    recommendations: string[],
  ) => {
    const options: Array<{ label: string; value: string }> = [];

    if (!providerList) return options;

    for (const provider of providerList) {
      for (const [modelId, model] of Object.entries(provider.models || {})) {
        const value = `${provider.id}/${modelId}`;
        const isRec = isModelRecommended(value, recommendations);
        const label = isRec
          ? `${provider.name} / ${model.name} (Recommended)`
          : `${provider.name} / ${model.name}`;
        options.push({ label, value });
      }
    }

    return options;
  };

  const getAgentModelOptions = (agent: AgentInfo) =>
    getModelOptions(providers, agent.recommendations ?? []);

  const error = saveAgents.error || resetAgents.error;
  const errorMessage = error instanceof Error ? error.message : null;
  const noProviders = !isLoading && getModelOptions(providers, []).length === 0;

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

        {isLoading ? (
          <div className={styles.loading}>
            <Spinner />
          </div>
        ) : noProviders ? (
          <Notice status="warning" isDismissible={false}>
            {__(
              'No models available. Make sure the OpenCode server is running and you have configured at least one provider.',
              'wordforge',
            )}
          </Notice>
        ) : (
          <div className={styles.agentsList}>
            {agents.map((agent) => {
              const currentValue =
                pendingChanges[agent.id] ?? agent.effectiveModel;
              const agentOptions = getAgentModelOptions(agent);
              const isRecommended = isModelRecommended(
                currentValue,
                agent.recommendations ?? [],
              );

              return (
                <div key={agent.id} className={styles.agentItem}>
                  <div className={styles.agentHeader}>
                    <div
                      className={styles.agentColor}
                      style={{ backgroundColor: agent.color }}
                    />
                    <div className={styles.agentInfo}>
                      <span className={styles.agentName}>{agent.name}</span>
                      <span className={styles.agentDescription}>
                        {agent.description}
                      </span>
                    </div>
                  </div>

                  <div className={styles.modelSelector}>
                    <SelectControl
                      value={currentValue}
                      options={agentOptions}
                      onChange={(value) => handleModelChange(agent.id, value)}
                      className={styles.select}
                    />
                    {isRecommended && (
                      <span className={styles.recommendedBadge}>
                        {__('Recommended', 'wordforge')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
      </CardBody>
    </Card>
  );
};
