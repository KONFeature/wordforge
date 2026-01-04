import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'stat' | 'revenue' | 'step' | 'info';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  as?: 'div' | 'article' | 'section';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      interactive = false,
      as: Component = 'div',
      children,
      ...props
    },
    ref,
  ) => {
    const classNames = [
      styles.card,
      styles[variant],
      interactive && styles.interactive,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Component ref={ref} className={classNames} {...props}>
        {children}
      </Component>
    );
  },
);

Card.displayName = 'Card';

export interface StatCardProps extends Omit<CardProps, 'variant'> {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  subtext?: ReactNode;
  badge?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  isRevenue?: boolean;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      icon,
      subtext,
      badge,
      trend,
      isRevenue = false,
      className,
      ...props
    },
    ref,
  ) => {
    const classNames = [
      styles.card,
      styles.stat,
      isRevenue && styles.revenue,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        <div className={styles.statHeader}>
          <span className={styles.statLabel}>{label}</span>
          {icon && <div className={styles.statIcon}>{icon}</div>}
        </div>
        <div className={styles.statBody}>
          <div className={styles.statValue}>{value}</div>
          {badge && <div className={styles.statBadge}>{badge}</div>}
        </div>
        {subtext && (
          <div
            className={`${styles.statSubtext} ${trend ? styles[`trend${trend.charAt(0).toUpperCase()}${trend.slice(1)}`] : ''}`}
          >
            {subtext}
          </div>
        )}
      </div>
    );
  },
);

StatCard.displayName = 'StatCard';

export interface StepCardProps extends Omit<CardProps, 'variant'> {
  step: number | string;
  title: string;
  description: string;
}

export const StepCard = forwardRef<HTMLDivElement, StepCardProps>(
  ({ step, title, description, className, ...props }, ref) => {
    return (
      <Card ref={ref} variant="step" className={className} {...props}>
        <div className={styles.stepNumber}>{step}</div>
        <div className={styles.stepContent}>
          <h3 className={styles.stepTitle}>{title}</h3>
          <p className={styles.stepDescription}>{description}</p>
        </div>
      </Card>
    );
  },
);

StepCard.displayName = 'StepCard';

export interface InfoCardProps extends Omit<CardProps, 'variant'> {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export const InfoCard = forwardRef<HTMLDivElement, InfoCardProps>(
  (
    { icon, title, subtitle, meta, actions, className, children, ...props },
    ref,
  ) => {
    return (
      <Card ref={ref} variant="info" className={className} {...props}>
        {icon && <div className={styles.infoIcon}>{icon}</div>}
        <div className={styles.infoContent}>
          <h2 className={styles.infoTitle}>{title}</h2>
          {subtitle && <p className={styles.infoSubtitle}>{subtitle}</p>}
          {meta && <div className={styles.infoMeta}>{meta}</div>}
          {children}
        </div>
        {actions && <div className={styles.infoActions}>{actions}</div>}
      </Card>
    );
  },
);

InfoCard.displayName = 'InfoCard';
