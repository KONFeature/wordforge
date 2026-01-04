import { type HTMLAttributes, forwardRef } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rect', width, height, style, ...props }, ref) => {
    const classNames = [styles.skeleton, styles[variant], className]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={classNames}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';

export const SkeletonCard = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={`${styles.card} ${className || ''}`} {...props}>
      <Skeleton variant="text" width="60%" height={12} />
      <Skeleton
        variant="text"
        width="80%"
        height={24}
        style={{ marginTop: 8 }}
      />
      <Skeleton
        variant="text"
        width="40%"
        height={12}
        style={{ marginTop: 8 }}
      />
    </div>
  );
});

SkeletonCard.displayName = 'SkeletonCard';
