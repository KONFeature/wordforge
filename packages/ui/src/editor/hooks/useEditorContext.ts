import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useMemo } from '@wordpress/element';
import type { ScopedContext } from '../../chat/hooks/useContextInjection';

interface EditorContextResult {
  context: ScopedContext | null;
  isLoading: boolean;
}

const getGutenbergCapabilities = () => {
  const blocksApi = window.wp?.blocks;
  const dataApi = window.wp?.data;

  if (!blocksApi || !dataApi) {
    return null;
  }

  const blockTypes = blocksApi.getBlockTypes?.() ?? [];
  const blockEditorDispatch = dataApi.dispatch?.('core/block-editor');

  const coreBlocks = blockTypes.filter((b: { name: string }) =>
    b.name.startsWith('core/'),
  );
  const pluginBlocks = blockTypes.filter(
    (b: { name: string }) => !b.name.startsWith('core/'),
  );

  return {
    gutenbergBridge: true,
    coreBlockCount: coreBlocks.length,
    pluginBlockCount: pluginBlocks.length,
    canInsertBlocks: !!blockEditorDispatch,
    canSerializeBlocks: !!blocksApi.serialize,
  };
};

export const useEditorContext = (): EditorContextResult => {
  const editorCapabilities = useMemo(() => getGutenbergCapabilities(), []);

  const selectResult = useSelect((select) => {
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
          type: 'template-editor' as const,
          templateId: template?.slug || String(postId),
          templateName:
            title || template?.title?.rendered || 'Untitled Template',
          templateType:
            postType === 'wp_template_part'
              ? ('template-part' as const)
              : ('template' as const),
        },
        isLoading: false,
      };
    }

    return {
      context: {
        type: 'page-editor' as const,
        pageId: postId,
        pageTitle:
          title || (postType === 'page' ? 'Untitled Page' : 'Untitled Post'),
        blockCount: Array.isArray(blocks) ? blocks.length : undefined,
        status,
      },
      isLoading: false,
    };
  }, []);

  if (!selectResult.context || selectResult.context.type !== 'page-editor') {
    return selectResult;
  }

  return {
    ...selectResult,
    context: {
      ...selectResult.context,
      editorCapabilities: editorCapabilities ?? undefined,
    },
  };
};
