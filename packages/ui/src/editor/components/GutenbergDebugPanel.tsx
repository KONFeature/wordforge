import { Button } from '@wordpress/components';
import { useState, useCallback } from '@wordpress/element';
import { chevronDown, chevronUp } from '@wordpress/icons';
import { Icon } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import { useGutenbergBridge } from '../hooks/useGutenbergBridge';
import { useBlockActions } from '../hooks/useBlockActions';
import styles from './GutenbergDebugPanel.module.css';

interface TestResult {
  success: boolean;
  message: string;
}

export const GutenbergDebugPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const { status, blockTypes } = useGutenbergBridge();
  const { insertBlocks, serializeBlocks, isReady } = useBlockActions();

  const handleTestSerialize = useCallback(() => {
    const result = serializeBlocks([
      {
        name: 'core/paragraph',
        attrs: { content: 'Test paragraph from Gutenberg Bridge' },
      },
    ]);

    if (result.success && result.data?.serialized) {
      setTestResult({
        success: true,
        message: result.data.serialized,
      });
    } else {
      setTestResult({
        success: false,
        message: result.error ?? 'Unknown error',
      });
    }
  }, [serializeBlocks]);

  const handleTestInsert = useCallback(() => {
    const result = insertBlocks([
      {
        name: 'core/paragraph',
        attrs: { content: '✨ Inserted via Gutenberg Bridge!' },
      },
    ]);

    setTestResult({
      success: result.success,
      message: result.message ?? result.error ?? 'Unknown',
    });
  }, [insertBlocks]);

  const statusDotClass = `${styles.statusDot} ${status.available ? styles.available : styles.unavailable}`;

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={styles.title}>
          <span className={statusDotClass} />
          {__('Gutenberg Bridge', 'wordforge')}
        </span>
        <span className={styles.toggle}>
          <Icon icon={isExpanded ? chevronUp : chevronDown} size={16} />
        </span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {__('Blocks API', 'wordforge')}
              </span>
              <span className={styles.statValue}>
                {status.blocksApi ? '✓' : '✗'}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {__('Editor API', 'wordforge')}
              </span>
              <span className={styles.statValue}>
                {status.blockEditorApi ? '✓' : '✗'}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {__('Core Blocks', 'wordforge')}
              </span>
              <span className={styles.statValue}>{status.coreBlockCount}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {__('Plugin Blocks', 'wordforge')}
              </span>
              <span className={styles.statValue}>
                {status.pluginBlockCount}
              </span>
            </div>
          </div>

          {status.categories.length > 0 && (
            <div className={styles.categories}>
              {status.categories.slice(0, 6).map((cat) => (
                <span key={cat} className={styles.categoryTag}>
                  {cat}
                </span>
              ))}
              {status.categories.length > 6 && (
                <span className={styles.categoryTag}>
                  +{status.categories.length - 6}
                </span>
              )}
            </div>
          )}

          <div className={styles.testSection}>
            <Button
              variant="secondary"
              size="small"
              className={styles.testButton}
              onClick={handleTestSerialize}
              disabled={!isReady}
            >
              {__('Test Serialize', 'wordforge')}
            </Button>{' '}
            <Button
              variant="secondary"
              size="small"
              className={styles.testButton}
              onClick={handleTestInsert}
              disabled={!isReady}
            >
              {__('Test Insert', 'wordforge')}
            </Button>
          </div>

          {testResult && (
            <div
              className={`${styles.testResult} ${testResult.success ? styles.success : styles.error}`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
