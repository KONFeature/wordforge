import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { ScopedContext } from '../hooks/useContextInjection';
import styles from './QuickActions.module.css';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

interface QuickActionsProps {
  context: ScopedContext | null;
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
}

const PRODUCT_LIST_ACTIONS: QuickAction[] = [
  {
    id: 'analyze-inventory',
    icon: '📊',
    label: __('Analyze inventory', 'wordforge'),
    prompt:
      'Analyze my product inventory. Show me low stock items, out of stock products, and any pricing anomalies.',
  },
  {
    id: 'create-product',
    icon: '➕',
    label: __('New product', 'wordforge'),
    prompt: 'Help me create a new product. Ask me about the product details.',
  },
  {
    id: 'seo-products',
    icon: '🔍',
    label: __('SEO check', 'wordforge'),
    prompt:
      'Review my product listings for SEO issues. Check for missing descriptions, short titles, and missing images.',
  },
  {
    id: 'bulk-update',
    icon: '✏️',
    label: __('Bulk update', 'wordforge'),
    prompt:
      'I want to bulk update products. What fields would you like to update?',
  },
];

const PRODUCT_EDITOR_ACTIONS: QuickAction[] = [
  {
    id: 'improve-description',
    icon: '✨',
    label: __('Improve description', 'wordforge'),
    prompt:
      "Improve this product's description to be more compelling and SEO-friendly while maintaining accuracy.",
  },
  {
    id: 'generate-seo',
    icon: '🔍',
    label: __('SEO optimize', 'wordforge'),
    prompt:
      'Analyze this product for SEO. Suggest improvements for the title, description, and meta data.',
  },
  {
    id: 'check-pricing',
    icon: '💰',
    label: __('Pricing review', 'wordforge'),
    prompt:
      "Review this product's pricing strategy. Is it competitive? Any suggestions?",
  },
  {
    id: 'stock-alert',
    icon: '📦',
    label: __('Stock status', 'wordforge'),
    prompt:
      "Check this product's stock status and suggest inventory management actions.",
  },
];

const POST_LIST_ACTIONS: QuickAction[] = [
  {
    id: 'create-post',
    icon: '✍️',
    label: __('Write post', 'wordforge'),
    prompt: 'Help me write a new blog post. What topic should we cover?',
  },
  {
    id: 'content-calendar',
    icon: '📅',
    label: __('Content ideas', 'wordforge'),
    prompt:
      'Suggest 5 blog post ideas based on my existing content and current trends.',
  },
  {
    id: 'review-drafts',
    icon: '📝',
    label: __('Review drafts', 'wordforge'),
    prompt:
      'List my draft posts and help me prioritize which ones to publish first.',
  },
  {
    id: 'seo-audit',
    icon: '🔍',
    label: __('SEO audit', 'wordforge'),
    prompt: 'Audit my recent posts for SEO issues and suggest improvements.',
  },
];

const PAGE_LIST_ACTIONS: QuickAction[] = [
  {
    id: 'create-page',
    icon: '📄',
    label: __('New page', 'wordforge'),
    prompt:
      'Help me create a new page. What type of page do you need? (About, Contact, Services, etc.)',
  },
  {
    id: 'review-structure',
    icon: '🗂️',
    label: __('Site structure', 'wordforge'),
    prompt:
      'Review my page structure and suggest improvements for better navigation and SEO.',
  },
  {
    id: 'update-content',
    icon: '🔄',
    label: __('Update pages', 'wordforge'),
    prompt:
      'Which pages need content updates? Review my pages for outdated information.',
  },
];

const MEDIA_LIST_ACTIONS: QuickAction[] = [
  {
    id: 'alt-text-audit',
    icon: '🏷️',
    label: __('Fix alt text', 'wordforge'),
    prompt:
      'Find images missing alt text and help me write SEO-friendly descriptions for them.',
  },
  {
    id: 'organize-media',
    icon: '📁',
    label: __('Organize', 'wordforge'),
    prompt:
      'Help me organize my media library. Suggest a naming convention and identify unused files.',
  },
  {
    id: 'optimize-images',
    icon: '⚡',
    label: __('Optimization tips', 'wordforge'),
    prompt:
      'Review my media library for optimization opportunities. Are there oversized images or uncompressed files?',
  },
  {
    id: 'find-media',
    icon: '🔍',
    label: __('Find media', 'wordforge'),
    prompt: 'Help me find specific media. What are you looking for?',
  },
];

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'help',
    icon: '💡',
    label: __('What can you do?', 'wordforge'),
    prompt: 'What can you help me with on my WordPress site?',
  },
  {
    id: 'content-overview',
    icon: '📊',
    label: __('Site overview', 'wordforge'),
    prompt:
      'Give me an overview of my WordPress site content: posts, pages, and media.',
  },
];

function getActionsForContext(context: ScopedContext | null): QuickAction[] {
  if (!context) return DEFAULT_ACTIONS;

  switch (context.type) {
    case 'product-list':
      return PRODUCT_LIST_ACTIONS;
    case 'product-editor':
      return PRODUCT_EDITOR_ACTIONS;
    case 'post-list':
      return POST_LIST_ACTIONS;
    case 'page-list':
      return PAGE_LIST_ACTIONS;
    case 'media-list':
      return MEDIA_LIST_ACTIONS;
    case 'page-editor':
      return [
        {
          id: 'improve-content',
          icon: '✨',
          label: __('Improve content', 'wordforge'),
          prompt:
            "Review and improve this page's content for clarity, engagement, and SEO.",
        },
        {
          id: 'add-section',
          icon: '➕',
          label: __('Add section', 'wordforge'),
          prompt:
            'Suggest a new section to add to this page. What would enhance it?',
        },
        {
          id: 'check-seo',
          icon: '🔍',
          label: __('SEO check', 'wordforge'),
          prompt: 'Analyze this page for SEO and suggest improvements.',
        },
      ];
    case 'template-editor':
      return [
        {
          id: 'template-help',
          icon: '🎨',
          label: __('Template tips', 'wordforge'),
          prompt:
            "Give me tips for improving this template's design and usability.",
        },
        {
          id: 'add-blocks',
          icon: '🧱',
          label: __('Block suggestions', 'wordforge'),
          prompt:
            'Suggest blocks to add to this template for better functionality.',
        },
      ];
    default:
      return DEFAULT_ACTIONS;
  }
}

export const QuickActions = ({
  context,
  onSelectAction,
  disabled = false,
}: QuickActionsProps) => {
  const actions = getActionsForContext(context);

  if (actions.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        {actions.map((action) => (
          <Button
            key={action.id}
            className={styles.actionButton}
            onClick={() => onSelectAction(action.prompt)}
            disabled={disabled}
            variant="secondary"
            size="compact"
          >
            <span className={styles.actionIcon}>{action.icon}</span>
            <span className={styles.actionLabel}>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
