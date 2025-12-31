import type { OpencodeClient } from '@opencode-ai/sdk/client';

export async function injectScopedContext(
  client: OpencodeClient,
  sessionId: string,
  context: ScopedContext,
): Promise<void> {
  const contextMessage = buildContextMessage(context);

  await client.session.prompt({
    path: { id: sessionId },
    body: {
      noReply: true,
      parts: [{ type: 'text', text: contextMessage }],
    },
  });
}

export type ScopedContext =
  | PageEditorContext
  | PageListContext
  | ProductEditorContext
  | ProductListContext
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
      return `[CONTEXT UPDATE] You are now helping the user edit Page ID ${context.pageId} titled "${context.pageTitle}".${
        context.blockCount !== undefined
          ? ` The page has ${context.blockCount} blocks.`
          : ''
      }${
        context.status ? ` Status: ${context.status}.` : ''
      } Use the wordforge/get-page-blocks and wordforge/update-page-blocks tools to work with this page.`;

    case 'page-list':
      return `[CONTEXT UPDATE] The user is viewing the ${context.postType} list. There are ${context.totalPosts} published${
        context.draftPosts ? ` and ${context.draftPosts} draft` : ''
      } items. The user may want to create new ${context.postType}s, search existing ones, or bulk edit. Use wordforge/list-content and wordforge/save-content tools.`;

    case 'product-editor':
      return `[CONTEXT UPDATE] You are now helping the user edit WooCommerce Product ID ${context.productId} named "${context.productName}".${
        context.productType ? ` Type: ${context.productType}.` : ''
      }${context.stockStatus ? ` Stock: ${context.stockStatus}.` : ''}${
        context.price ? ` Price: ${context.price}.` : ''
      }${context.sku ? ` SKU: ${context.sku}.` : ''}${
        context.categories?.length
          ? ` Categories: ${context.categories.join(', ')}.`
          : ''
      } Use wordforge/get-product and wordforge/save-product to work with this product.`;

    case 'product-list':
      return `[CONTEXT UPDATE] The user is viewing the WooCommerce Products list. There are ${context.totalProducts} published${
        context.draftProducts ? ` and ${context.draftProducts} draft` : ''
      } products.${
        context.productCategories?.length
          ? ` Categories: ${context.productCategories.map((c) => `${c.name} (${c.count})`).join(', ')}.`
          : ''
      } The user may want to create new products, search existing ones, analyze inventory, or bulk edit. Use wordforge/list-products and wordforge/save-product tools.`;

    case 'template-editor':
      return `[CONTEXT UPDATE] You are now helping the user edit ${context.templateType || 'template'} "${context.templateName}" (${context.templateId}). Use the wordforge/get-template and wordforge/update-template tools to work with this template.`;

    case 'custom':
      return `[CONTEXT UPDATE] ${context.message}`;
  }
}

export function useInjectContext(
  client: OpencodeClient | null,
  sessionId: string | null,
) {
  return {
    mutate: async (context: ScopedContext) => {
      if (!client || !sessionId) return;
      await injectScopedContext(client, sessionId, context);
    },
  };
}
