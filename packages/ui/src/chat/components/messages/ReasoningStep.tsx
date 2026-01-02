import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import { CollapsibleStep } from './CollapsibleStep';
import { Markdown } from './Markdown';
import type { ReasoningPart } from './types';

interface ReasoningStepProps {
  part: ReasoningPart;
}

export const ReasoningStep = ({ part }: ReasoningStepProps) => {
  const hasContent = part.text && part.text.trim().length > 0;

  if (!hasContent) {
    return (
      <div className={styles.simpleStep}>
        <span>{__('Thinking...', 'wordforge')}</span>
      </div>
    );
  }

  return (
    <CollapsibleStep
      title={__('Thinking', 'wordforge')}
      defaultExpanded={false}
    >
      <div className={styles.reasoningContent}>
        <Markdown>{part.text}</Markdown>
      </div>
    </CollapsibleStep>
  );
};
