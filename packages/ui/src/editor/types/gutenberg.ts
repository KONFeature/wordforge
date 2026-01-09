/**
 * TypeScript definitions for Gutenberg/WordPress Block APIs
 * These are available in the editor context via the global `wp` object
 */

/**
 * Block type definition from wp.blocks.getBlockTypes()
 */
export interface WPBlockType {
  name: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string | { src: string };
  keywords?: string[];
  attributes?: Record<string, WPBlockAttribute>;
  supports?: Record<string, unknown>;
  parent?: string[];
  ancestor?: string[];
  allowedBlocks?: string[];
  styles?: Array<{ name: string; label: string; isDefault?: boolean }>;
  variations?: WPBlockVariation[];
  example?: Record<string, unknown>;
  // Editor-only
  edit?: unknown;
  save?: unknown;
}

export interface WPBlockAttribute {
  type?: string;
  default?: unknown;
  source?: string;
  selector?: string;
  attribute?: string;
  enum?: unknown[];
}

export interface WPBlockVariation {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  attributes?: Record<string, unknown>;
  innerBlocks?: WPBlockInstance[];
  isDefault?: boolean;
  scope?: string[];
}

/**
 * A block instance (what createBlock returns)
 */
export interface WPBlockInstance {
  clientId: string;
  name: string;
  isValid: boolean;
  attributes: Record<string, unknown>;
  innerBlocks: WPBlockInstance[];
  originalContent?: string;
}

/**
 * Block specification for AI commands - simplified format for LLM interaction
 */
export interface BlockSpec {
  name: string;
  attrs?: Record<string, unknown>;
  innerBlocks?: BlockSpec[];
}

/**
 * Result of a block operation
 */
export interface BlockOperationResult {
  success: boolean;
  message?: string;
  data?: {
    insertedCount?: number;
    serialized?: string;
    blocks?: WPBlockInstance[];
  };
  error?: string;
}

/**
 * Gutenberg bridge status
 */
export interface GutenbergBridgeStatus {
  available: boolean;
  blocksApi: boolean;
  blockEditorApi: boolean;
  dataApi: boolean;
  blockCount: number;
  coreBlockCount: number;
  pluginBlockCount: number;
  categories: string[];
}

/**
 * Simplified block type info for AI context
 */
export interface BlockTypeInfo {
  name: string;
  title: string;
  category?: string;
  description?: string;
  attributeNames: string[];
  supportsInnerBlocks: boolean;
  isCore: boolean;
}

declare global {
  interface Window {
    wp?: {
      blocks?: {
        getBlockTypes: () => WPBlockType[];
        getBlockType: (name: string) => WPBlockType | undefined;
        createBlock: (
          name: string,
          attributes?: Record<string, unknown>,
          innerBlocks?: WPBlockInstance[],
        ) => WPBlockInstance;
        serialize: (blocks: WPBlockInstance | WPBlockInstance[]) => string;
        parse: (content: string) => WPBlockInstance[];
        getCategories: () => Array<{ slug: string; title: string }>;
        registerBlockType: unknown;
        unregisterBlockType: unknown;
      };
      data?: {
        select: (store: string) => unknown;
        dispatch: (store: string) => unknown;
        subscribe: (listener: () => void) => () => void;
      };
      blockEditor?: {
        store: string;
      };
    };
  }
}
