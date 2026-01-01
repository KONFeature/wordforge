import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import type { ScopedContext } from '../../chat/hooks/useContextInjection';

interface EditorContextResult {
  context: ScopedContext | null;
  isLoading: boolean;
}

export const useEditorContext = (): EditorContextResult =>
  useSelect((select) => {
    const editorSelectors = select(editorStore) as {
      getCurrentPostId?: () => number | null;
      getCurrentPostType?: () => string | null;
      getEditedPostAttribute?: (attr: string) => unknown;
    };

    const postId = editorSelectors.getCurrentPostId?.();
    const postType = editorSelectors.getCurrentPostType?.();

    if (!postId || !postType) {
      return { context: null, isLoading: false };
    }

    const title = editorSelectors.getEditedPostAttribute?.('title') as string;
    const status = editorSelectors.getEditedPostAttribute?.('status') as string;
    const blocks = editorSelectors.getEditedPostAttribute?.('blocks') as
      | unknown[]
      | undefined;

    if (postType === 'wp_template' || postType === 'wp_template_part') {
      const coreSelectors = select(coreStore) as {
        getEditedEntityRecord?: (
          kind: string,
          name: string,
          id: number,
        ) => { slug?: string; title?: { rendered?: string } } | null;
      };

      const template = coreSelectors.getEditedEntityRecord?.(
        'postType',
        postType,
        postId,
      );

      return {
        context: {
          type: 'template-editor',
          templateId: template?.slug || String(postId),
          templateName:
            title || template?.title?.rendered || 'Untitled Template',
          templateType:
            postType === 'wp_template_part' ? 'template-part' : 'template',
        },
        isLoading: false,
      } as const;
    }

    if (postType === 'page') {
      return {
        context: {
          type: 'page-editor',
          pageId: postId,
          pageTitle: title || 'Untitled Page',
          blockCount: Array.isArray(blocks) ? blocks.length : undefined,
          status,
        },
        isLoading: false,
      } as const;
    }

    return {
      context: {
        type: 'page-editor',
        pageId: postId,
        pageTitle: title || 'Untitled Post',
        blockCount: Array.isArray(blocks) ? blocks.length : undefined,
        status,
      },
      isLoading: false,
    } as const;
  }, []);
