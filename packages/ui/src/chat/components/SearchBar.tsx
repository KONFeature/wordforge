import { Button, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  matchCount: number;
  isSearching: boolean;
}

export const SearchBar = ({
  value,
  onChange,
  onClear,
  matchCount,
  isSearching,
}: SearchBarProps) => {
  return (
    <div className={styles.root}>
      <div className={styles.inputWrapper}>
        <span className={`${styles.icon} dashicons dashicons-search`} />
        <TextControl
          __nextHasNoMarginBottom
          value={value}
          onChange={onChange}
          placeholder={__('Search messages...', 'wordforge')}
          className={styles.input}
        />
        {isSearching && (
          <>
            <span className={styles.count}>
              {matchCount}{' '}
              {matchCount === 1
                ? __('match', 'wordforge')
                : __('matches', 'wordforge')}
            </span>
            <Button
              icon="no-alt"
              label={__('Clear search', 'wordforge')}
              onClick={onClear}
              size="small"
              className={styles.clearButton}
            />
          </>
        )}
      </div>
    </div>
  );
};
