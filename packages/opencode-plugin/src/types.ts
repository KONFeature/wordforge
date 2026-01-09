export interface PendingRequest {
  id: string;
  tool: string;
  args: unknown;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export interface BlockSpec {
  name: string;
  attrs?: Record<string, unknown>;
  innerBlocks?: BlockSpec[];
}

export interface BlockOperationResult {
  success: boolean;
  message?: string;
  insertedCount?: number;
  serialized?: string;
  blocks?: unknown[];
  error?: string;
}

export interface BlockTypeInfo {
  name: string;
  title: string;
  category?: string;
  description?: string;
  attributes?: Record<string, unknown>;
}

export type WaitForBrowser = <T>(
  tool: string,
  args: unknown,
  timeout?: number,
) => Promise<T>;
