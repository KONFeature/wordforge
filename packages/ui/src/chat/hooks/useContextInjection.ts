import type { Part } from '@opencode-ai/sdk/v2';

const CONTEXT_TAG_OPEN = '<user_context>';
const CONTEXT_TAG_CLOSE = '</user_context>';

export type ScopedContext =
  | PageEditorContext
  | PageListContext
  | PostListContext
  | ProductEditorContext
  | ProductListContext
  | MediaListContext
  | TemplateEditorContext
  | CustomContext;

interface PageEditorContext {
  type: 'page-editor';
  pageId: number;
  pageTitle: string;
  blockCount?: number;
  lastModified?: string;
  status?: string;
}

interface PageListContext {
  type: 'page-list';
  postType: string;
  totalPosts: number;
  draftPosts?: number;
}

interface PostListContext {
  type: 'post-list';
  postType: string;
  totalPosts: number;
  draftPosts?: number;
  categories?: Array<{ id: number; name: string; count: number }>;
}

interface ProductEditorContext {
  type: 'product-editor';
  productId: number;
  productName: string;
  productType?: string;
  stockStatus?: string;
  price?: string;
  sku?: string;
  categories?: string[];
}

interface ProductListContext {
  type: 'product-list';
  totalProducts: number;
  draftProducts?: number;
  productCategories?: Array<{ id: number; name: string; count: number }>;
}

interface MediaListContext {
  type: 'media-list';
  totalMedia: number;
  images?: number;
  videos?: number;
  audio?: number;
  documents?: number;
}

interface TemplateEditorContext {
  type: 'template-editor';
  templateId: string;
  templateName: string;
  templateType?: 'template' | 'template-part';
}

interface CustomContext {
  type: 'custom';
  message: string;
}

function buildContextMessage(context: ScopedContext): string {
  switch (context.type) {
    case 'page-editor':
      return `You are now helping the user edit Page ID ${context.pageId} titled "${context.pageTitle}".${
        context.blockCount !== undefined
          ? ` The page has ${context.blockCount} blocks.`
          : ''
      }${
        context.status ? ` Status: ${context.status}.` : ''
      } Use the wordforge/get-page-blocks and wordforge/update-page-blocks tools to work with this page.`;

    case 'page-list':
      return `The user is viewing the Pages list. There are ${context.totalPosts} published${
        context.draftPosts ? ` and ${context.draftPosts} draft` : ''
      } pages. The user may want to create new pages, search existing ones, or bulk edit. Use wordforge/list-content (with post_type: "page") and wordforge/save-content tools.`;

    case 'post-list':
      return `The user is viewing the Posts list. There are ${context.totalPosts} published${
        context.draftPosts ? ` and ${context.draftPosts} draft` : ''
      } posts.${
        context.categories?.length
          ? ` Categories: ${context.categories.map((c) => `${c.name} (${c.count})`).join(', ')}.`
          : ''
      } The user may want to create new posts, search existing ones, or bulk edit. Use wordforge/list-content and wordforge/save-content tools.`;

    case 'product-editor':
      return `You are now helping the user edit WooCommerce Product ID ${context.productId} named "${context.productName}".${
        context.productType ? ` Type: ${context.productType}.` : ''
      }${context.stockStatus ? ` Stock: ${context.stockStatus}.` : ''}${
        context.price ? ` Price: ${context.price}.` : ''
      }${context.sku ? ` SKU: ${context.sku}.` : ''}${
        context.categories?.length
          ? ` Categories: ${context.categories.join(', ')}.`
          : ''
      } Use wordforge/get-product and wordforge/save-product to work with this product.`;

    case 'product-list':
      return `The user is viewing the WooCommerce Products list. There are ${context.totalProducts} published${
        context.draftProducts ? ` and ${context.draftProducts} draft` : ''
      } products.${
        context.productCategories?.length
          ? ` Categories: ${context.productCategories.map((c) => `${c.name} (${c.count})`).join(', ')}.`
          : ''
      } The user may want to create new products, search existing ones, analyze inventory, or bulk edit. Use wordforge/list-products and wordforge/save-product tools.`;

    case 'media-list':
      return `The user is viewing the Media Library. There are ${context.totalMedia} media files${
        context.images ? ` (${context.images} images` : ''
      }${context.videos ? `, ${context.videos} videos` : ''}${
        context.audio ? `, ${context.audio} audio` : ''
      }${context.documents ? `, ${context.documents} documents` : ''}${
        context.images || context.videos || context.audio || context.documents
          ? ')'
          : ''
      }. The user may want to upload new media, update alt text/captions, organize files, or find specific media. Use wordforge/list-media, wordforge/upload-media, and wordforge/update-media tools.`;

    case 'template-editor':
      return `You are now helping the user edit ${context.templateType || 'template'} "${context.templateName}" (${context.templateId}). Use the wordforge/get-template and wordforge/update-template tools to work with this template.`;

    case 'custom':
      return context.message;
  }
}

/**
 * Formats context as XML for inclusion in messages.
 */
export function formatContextXml(context: ScopedContext): string {
  const message = buildContextMessage(context);
  return `${CONTEXT_TAG_OPEN}\n${message}\n${CONTEXT_TAG_CLOSE}`;
}

/**
 * Extracts context text from an XML-wrapped context string.
 * Returns null if no context found.
 */
export function extractContextFromXml(text: string): string | null {
  const openIdx = text.indexOf(CONTEXT_TAG_OPEN);
  const closeIdx = text.indexOf(CONTEXT_TAG_CLOSE);

  if (openIdx === -1 || closeIdx === -1 || closeIdx <= openIdx) {
    return null;
  }

  return text.slice(openIdx + CONTEXT_TAG_OPEN.length, closeIdx).trim();
}

/**
 * Checks if a text part contains context XML.
 */
export function isContextPart(part: Part): boolean {
  return (
    part.type === 'text' &&
    'text' in part &&
    part.text.includes(CONTEXT_TAG_OPEN)
  );
}

interface MessageWithParts {
  parts: Part[];
}

/**
 * Returns true if context should be included (no previous context or context changed).
 */
export function shouldIncludeContext(
  messages: MessageWithParts[],
  newContextXml: string,
): boolean {
  if (messages.length === 0) return true;

  const lastUserMsg = [...messages].reverse().find((m) => {
    const hasUserRole =
      'info' in m &&
      typeof m.info === 'object' &&
      m.info !== null &&
      'role' in m.info &&
      m.info.role === 'user';
    return hasUserRole;
  });

  if (!lastUserMsg) return true;

  const contextPart = lastUserMsg.parts.find(
    (p): p is Part & { type: 'text'; text: string } =>
      p.type === 'text' && 'text' in p && p.text.includes(CONTEXT_TAG_OPEN),
  );

  if (!contextPart) return true;

  const lastContext = extractContextFromXml(contextPart.text);
  const newContext = extractContextFromXml(newContextXml);

  return lastContext !== newContext;
}
