import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from '../MessageList.module.css';
import { CollapsibleStep } from './CollapsibleStep';
import type { ToolPart } from './types';

interface ToolCallStepProps {
  part: ToolPart;
}

export const ToolCallStep = ({ part }: ToolCallStepProps) => {
  const state = part.state;
  const status = state.status;
  const title = ('title' in state && state.title) || part.tool || 'unknown';

  const input = 'input' in state ? state.input : undefined;
  const output =
    'output' in state && state.status === 'completed'
      ? state.output
      : undefined;
  const error =
    'error' in state && state.status === 'error' ? state.error : undefined;

  const hasContent = input || output || error;

  if (!hasContent) {
    return (
      <div className={`${styles.simpleStep} ${styles[status]}`}>
        {status === 'running' || status === 'pending' ? <Spinner /> : null}
        <span>{title}</span>
        {status && status !== 'running' && status !== 'pending' && (
          <span className={`${styles.simpleStepStatus} ${styles[status]}`}>
            {status === 'completed'
              ? __('Done', 'wordforge')
              : status === 'error'
                ? __('Failed', 'wordforge')
                : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <CollapsibleStep title={title} status={status} defaultExpanded={false}>
      {input && (
        <div className={styles.stepSection}>
          <div className={styles.stepSectionLabel}>
            {__('Input', 'wordforge')}
          </div>
          <pre className={styles.stepSectionContent}>
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
      {output && (
        <div className={styles.stepSection}>
          <div className={styles.stepSectionLabel}>
            {__('Output', 'wordforge')}
          </div>
          <pre className={styles.stepSectionContent}>
            {typeof output === 'string'
              ? output
              : JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
      {error && (
        <div className={styles.stepSection}>
          <div className={styles.stepSectionLabel}>
            {__('Error', 'wordforge')}
          </div>
          <pre className={`${styles.stepSectionContent} ${styles.error}`}>
            {error}
          </pre>
        </div>
      )}
    </CollapsibleStep>
  );
};
