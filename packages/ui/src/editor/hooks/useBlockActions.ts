import { useCallback } from '@wordpress/element';
import type {
  BlockOperationResult,
  BlockSpec,
  WPBlockInstance,
} from '../types/gutenberg';

type BlockEditorDispatch = {
  insertBlocks: (
    blocks: WPBlockInstance[],
    index?: number,
    rootClientId?: string,
  ) => void;
  replaceBlocks: (
    clientIds: string | string[],
    blocks: WPBlockInstance[],
  ) => void;
  removeBlocks: (clientIds: string | string[]) => void;
  selectBlock: (clientId: string) => void;
};

type BlockEditorSelect = {
  getBlocks: () => WPBlockInstance[];
  getSelectedBlockClientId: () => string | null;
  getBlockIndex: (clientId: string) => number;
  getBlockRootClientId: (clientId: string) => string | null;
};

const getBlocksApi = () => window.wp?.blocks;
const getDataApi = () => window.wp?.data;

const getBlockEditorDispatch = (): BlockEditorDispatch | null => {
  const dispatch = getDataApi()?.dispatch?.('core/block-editor');
  return dispatch as BlockEditorDispatch | null;
};

const getBlockEditorSelect = (): BlockEditorSelect | null => {
  const select = getDataApi()?.select?.('core/block-editor');
  return select as BlockEditorSelect | null;
};

const createBlockFromSpec = (spec: BlockSpec): WPBlockInstance | null => {
  const blocksApi = getBlocksApi();
  if (!blocksApi?.createBlock) return null;

  const innerBlocks = (spec.innerBlocks ?? [])
    .map(createBlockFromSpec)
    .filter((b): b is WPBlockInstance => b !== null);

  return blocksApi.createBlock(spec.name, spec.attrs ?? {}, innerBlocks);
};

export interface UseBlockActionsResult {
  insertBlocks: (
    specs: BlockSpec[],
    options?: { position?: number; rootClientId?: string },
  ) => BlockOperationResult;
  replaceSelectedBlock: (specs: BlockSpec[]) => BlockOperationResult;
  removeSelectedBlock: () => BlockOperationResult;
  serializeBlocks: (specs: BlockSpec[]) => BlockOperationResult;
  getCurrentBlocks: () => WPBlockInstance[];
  getSelectedBlockId: () => string | null;
  isReady: boolean;
}

export const useBlockActions = (): UseBlockActionsResult => {
  const isReady = !!(getBlocksApi() && getBlockEditorDispatch());

  const insertBlocks = useCallback(
    (
      specs: BlockSpec[],
      options?: { position?: number; rootClientId?: string },
    ): BlockOperationResult => {
      const dispatch = getBlockEditorDispatch();
      if (!dispatch) {
        return {
          success: false,
          error: 'Block editor not available',
        };
      }

      const blocks = specs
        .map(createBlockFromSpec)
        .filter((b): b is WPBlockInstance => b !== null);

      if (blocks.length === 0) {
        return {
          success: false,
          error: 'No valid blocks to insert',
        };
      }

      try {
        dispatch.insertBlocks(blocks, options?.position, options?.rootClientId);
        return {
          success: true,
          message: `Inserted ${blocks.length} block(s)`,
          data: { insertedCount: blocks.length },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to insert blocks',
        };
      }
    },
    [],
  );

  const replaceSelectedBlock = useCallback(
    (specs: BlockSpec[]): BlockOperationResult => {
      const dispatch = getBlockEditorDispatch();
      const select = getBlockEditorSelect();
      if (!dispatch || !select) {
        return {
          success: false,
          error: 'Block editor not available',
        };
      }

      const selectedId = select.getSelectedBlockClientId();
      if (!selectedId) {
        return {
          success: false,
          error: 'No block selected',
        };
      }

      const blocks = specs
        .map(createBlockFromSpec)
        .filter((b): b is WPBlockInstance => b !== null);

      if (blocks.length === 0) {
        return {
          success: false,
          error: 'No valid blocks to insert',
        };
      }

      try {
        dispatch.replaceBlocks(selectedId, blocks);
        return {
          success: true,
          message: `Replaced block with ${blocks.length} new block(s)`,
          data: { insertedCount: blocks.length },
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to replace block',
        };
      }
    },
    [],
  );

  const removeSelectedBlock = useCallback((): BlockOperationResult => {
    const dispatch = getBlockEditorDispatch();
    const select = getBlockEditorSelect();
    if (!dispatch || !select) {
      return {
        success: false,
        error: 'Block editor not available',
      };
    }

    const selectedId = select.getSelectedBlockClientId();
    if (!selectedId) {
      return {
        success: false,
        error: 'No block selected',
      };
    }

    try {
      dispatch.removeBlocks(selectedId);
      return {
        success: true,
        message: 'Block removed',
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to remove block',
      };
    }
  }, []);

  const serializeBlocks = useCallback(
    (specs: BlockSpec[]): BlockOperationResult => {
      const blocksApi = getBlocksApi();
      if (!blocksApi?.serialize) {
        return {
          success: false,
          error: 'Blocks API not available',
        };
      }

      const blocks = specs
        .map(createBlockFromSpec)
        .filter((b): b is WPBlockInstance => b !== null);

      if (blocks.length === 0) {
        return {
          success: false,
          error: 'No valid blocks to serialize',
        };
      }

      try {
        const serialized = blocksApi.serialize(blocks);
        return {
          success: true,
          data: { serialized },
        };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : 'Failed to serialize blocks',
        };
      }
    },
    [],
  );

  const getCurrentBlocks = useCallback((): WPBlockInstance[] => {
    const select = getBlockEditorSelect();
    return select?.getBlocks() ?? [];
  }, []);

  const getSelectedBlockId = useCallback((): string | null => {
    const select = getBlockEditorSelect();
    return select?.getSelectedBlockClientId() ?? null;
  }, []);

  return {
    insertBlocks,
    replaceSelectedBlock,
    removeSelectedBlock,
    serializeBlocks,
    getCurrentBlocks,
    getSelectedBlockId,
    isReady,
  };
};
