import type { Agent } from '@opencode-ai/sdk/client';
import { Button, Popover } from '@wordpress/components';
import { memo, useCallback, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './AgentSelector.module.css';

const DEFAULT_AGENT = 'wordpress-manager';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: string | null;
  onSelectAgent: (agentName: string) => void;
  disabled?: boolean;
}

const AgentButton = memo(
  ({
    agent,
    isSelected,
    onClick,
  }: {
    agent: Agent;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${styles.agentButton} ${isSelected ? styles.selected : ''}`}
        aria-pressed={isSelected}
      >
        <span className={styles.agentName}>{agent.name}</span>
        {isSelected && <span className={styles.checkmark}>✓</span>}
      </button>
    );
  },
);

export const AgentSelector = ({
  agents,
  selectedAgent,
  onSelectAgent,
  disabled,
}: AgentSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredAgents = useMemo(() => {
    if (!Array.isArray(agents)) return [];
    return agents.filter(
      (agent) => !(agent.hidden ?? false) && agent.mode !== 'subagent',
    );
  }, [agents]);

  const getAgentDisplayName = useCallback((): string => {
    const agent = filteredAgents.find((a) => a.name === selectedAgent);
    return agent?.name ?? selectedAgent ?? __('Select Agent', 'wordforge');
  }, [selectedAgent, filteredAgents]);

  const handleSelectAgent = useCallback(
    (agentName: string) => {
      onSelectAgent(agentName);
      setIsOpen(false);
    },
    [onSelectAgent],
  );

  if (filteredAgents.length === 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        size="small"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerIcon} aria-hidden="true">
          🤖
        </span>
        <span className={styles.triggerText}>{getAgentDisplayName()}</span>
        <span className={styles.triggerArrow} aria-hidden="true">
          ▾
        </span>
      </Button>

      {isOpen && (
        <Popover
          position="top left"
          onClose={() => setIsOpen(false)}
          focusOnMount="firstElement"
        >
          <div className={styles.popoverContent}>
            <div className={styles.agentList}>
              {filteredAgents.map((agent) => (
                <AgentButton
                  key={agent.name}
                  agent={agent}
                  isSelected={selectedAgent === agent.name}
                  onClick={() => handleSelectAgent(agent.name)}
                />
              ))}
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
};

export { DEFAULT_AGENT };
