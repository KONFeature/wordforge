import { type InputHTMLAttributes, forwardRef } from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s/g, '-') : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`${styles.wrapper} ${className || ''}`}
      >
        <div className={styles.content}>
          {label && <span className={styles.label}>{label}</span>}
          {description && (
            <span className={styles.description}>{description}</span>
          )}
        </div>
        <div className={styles.toggleContainer}>
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className={styles.input}
            {...props}
          />
          <span className={styles.track}>
            <span className={styles.thumb} />
          </span>
        </div>
      </label>
    );
  },
);

Toggle.displayName = 'Toggle';
