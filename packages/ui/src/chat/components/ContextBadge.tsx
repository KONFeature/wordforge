import type { ScopedContext } from '../hooks/useContextInjection';
import styles from './ContextBadge.module.css';

interface ContextBadgeProps {
  context: ScopedContext;
}

export const ContextBadge = ({ context }: ContextBadgeProps) => {
  const getContextLabel = (): { icon: string; label: string } => {
    switch (context.type) {
      case 'product-editor':
        return { icon: '📦', label: context.productName };
      case 'product-list':
        return { icon: '📦', label: `${context.totalProducts} products` };
      case 'page-editor':
        return { icon: '📄', label: context.pageTitle };
      case 'page-list':
        return { icon: '📄', label: `${context.totalPosts} pages` };
      case 'post-list':
        return { icon: '📝', label: `${context.totalPosts} posts` };
      case 'media-list':
        return { icon: '🖼️', label: `${context.totalMedia} media files` };
      case 'template-editor':
        return { icon: '🎨', label: context.templateName };
      case 'custom':
        return { icon: '💡', label: 'Custom context' };
      default:
        return { icon: '📍', label: 'Context active' };
    }
  };

  const { icon, label } = getContextLabel();

  return (
    <div className={styles.contextBadge}>
      <span className={styles.contextIcon}>{icon}</span>
      <span className={styles.contextLabel}>{label}</span>
    </div>
  );
};
