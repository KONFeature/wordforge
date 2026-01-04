import * as ProgressPrimitive from '@radix-ui/react-progress';
import { forwardRef } from 'react';
import styles from './Progress.module.css';

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, label, showValue = false, className }, ref) => {
    const percentage = Math.round((value / max) * 100);

    return (
      <div ref={ref} className={`${styles.container} ${className || ''}`}>
        {(label || showValue) && (
          <div className={styles.header}>
            {label && <span className={styles.label}>{label}</span>}
            {showValue && <span className={styles.value}>{percentage}%</span>}
          </div>
        )}
        <ProgressPrimitive.Root className={styles.root} value={value} max={max}>
          <ProgressPrimitive.Indicator
            className={styles.indicator}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  },
);

Progress.displayName = 'Progress';
