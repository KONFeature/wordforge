import type { OpencodeClient } from '@opencode-ai/sdk/client';

/**
 * Injects scoped context into a session without triggering an AI response.
 *
 * Use this when entering a specific editing context (page editor, product editor, etc.)
 * to give the AI additional awareness without changing the agent configuration.
 *
 * @example
 * // When user opens the page editor
 * await injectScopedContext(client, sessionId, {
 *   type: 'page-editor',
 *   pageId: 123,
 *   pageTitle: 'About Us',
 *   blockCount: 5,
 *   lastModified: '2025-01-01',
 * });
 *
 * @example
 * // When user opens the product editor (WooCommerce)
 * await injectScopedContext(client, sessionId, {
 *   type: 'product-editor',
 *   productId: 456,
 *   productName: 'Awesome T-Shirt',
 *   productType: 'simple',
 *   stockStatus: 'instock',
 * });
 */
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
  | ProductEditorContext
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

interface ProductEditorContext {
  type: 'product-editor';
  productId: number;
  productName: string;
  productType?: string;
  stockStatus?: string;
  price?: string;
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

    case 'product-editor':
      return `[CONTEXT UPDATE] You are now helping the user edit Product ID ${context.productId} named "${context.productName}".${
        context.productType ? ` Type: ${context.productType}.` : ''
      }${context.stockStatus ? ` Stock: ${context.stockStatus}.` : ''}${
        context.price ? ` Price: ${context.price}.` : ''
      } Use the wordforge/get-product and wordforge/save-product tools to work with this product.`;

    case 'template-editor':
      return `[CONTEXT UPDATE] You are now helping the user edit ${context.templateType || 'template'} "${context.templateName}" (${context.templateId}). Use the wordforge/get-template and wordforge/update-template tools to work with this template.`;

    case 'custom':
      return `[CONTEXT UPDATE] ${context.message}`;
  }
}

/**
 * Hook for injecting context when entering an editing context.
 * Returns a mutation that can be called with context data.
 *
 * @example
 * const injectContext = useInjectContext(client, sessionId);
 *
 * // When entering page editor
 * injectContext.mutate({
 *   type: 'page-editor',
 *   pageId: 123,
 *   pageTitle: 'About Us',
 * });
 */
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
