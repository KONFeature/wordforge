import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import type {
  BlockTypeInfo,
  GutenbergBridgeStatus,
  WPBlockType,
} from '../types/gutenberg';

const getBlocksApi = () => window.wp?.blocks;
const getDataApi = () => window.wp?.data;

const checkApiAvailability = (): GutenbergBridgeStatus => {
  const blocksApi = getBlocksApi();
  const dataApi = getDataApi();

  const blockTypes = blocksApi?.getBlockTypes?.() ?? [];
  const categories = blocksApi?.getCategories?.() ?? [];

  const coreBlocks = blockTypes.filter((b) => b.name.startsWith('core/'));
  const pluginBlocks = blockTypes.filter((b) => !b.name.startsWith('core/'));

  return {
    available: !!blocksApi && !!dataApi,
    blocksApi: !!blocksApi,
    blockEditorApi: !!dataApi?.select?.('core/block-editor'),
    dataApi: !!dataApi,
    blockCount: blockTypes.length,
    coreBlockCount: coreBlocks.length,
    pluginBlockCount: pluginBlocks.length,
    categories: categories.map((c) => c.slug),
  };
};

const transformBlockType = (blockType: WPBlockType): BlockTypeInfo => ({
  name: blockType.name,
  title: blockType.title,
  category: blockType.category,
  description: blockType.description,
  attributeNames: Object.keys(blockType.attributes ?? {}),
  supportsInnerBlocks: !!(
    blockType.supports?.innerBlocks ?? blockType.allowedBlocks?.length
  ),
  isCore: blockType.name.startsWith('core/'),
});

export interface UseGutenbergBridgeResult {
  status: GutenbergBridgeStatus;
  isAvailable: boolean;
  blockTypes: BlockTypeInfo[];
  getBlockType: (name: string) => BlockTypeInfo | undefined;
  refresh: () => void;
}

export const useGutenbergBridge = (): UseGutenbergBridgeResult => {
  const [status, setStatus] = useState<GutenbergBridgeStatus>(() =>
    checkApiAvailability(),
  );
  const [blockTypes, setBlockTypes] = useState<BlockTypeInfo[]>([]);

  const refresh = useCallback(() => {
    const newStatus = checkApiAvailability();
    setStatus(newStatus);

    const blocksApi = getBlocksApi();
    if (blocksApi) {
      const types = blocksApi.getBlockTypes?.() ?? [];
      setBlockTypes(types.map(transformBlockType));
    }
  }, []);

  useEffect(() => {
    refresh();

    const dataApi = getDataApi();
    if (dataApi?.subscribe) {
      const unsubscribe = dataApi.subscribe(() => {
        const currentCount = getBlocksApi()?.getBlockTypes?.().length ?? 0;
        if (currentCount !== status.blockCount) {
          refresh();
        }
      });
      return unsubscribe;
    }
  }, []);

  const getBlockType = useCallback(
    (name: string): BlockTypeInfo | undefined => {
      return blockTypes.find((b) => b.name === name);
    },
    [blockTypes],
  );

  const isAvailable = useMemo(() => status.available, [status.available]);

  return {
    status,
    isAvailable,
    blockTypes,
    getBlockType,
    refresh,
  };
};
