import { type Plugin, tool } from '@opencode-ai/plugin';
import { createBrowserServer } from './server';
import type {
  BlockOperationResult,
  BlockTypeInfo,
  WaitForBrowser,
} from './types';

const BROWSER_SERVER_PORT = 9876;

interface BlockInstance {
  clientId: string;
  name: string;
  attributes: Record<string, unknown>;
  innerBlocks: BlockInstance[];
}

const blockSchema = tool.schema.object({
  name: tool.schema.string().describe("Block name, e.g. 'core/paragraph'"),
  attrs: tool.schema
    .record(tool.schema.string(), tool.schema.unknown())
    .optional()
    .describe('Block attributes'),
  innerBlocks: tool.schema
    .array(
      tool.schema.object({
        name: tool.schema.string(),
        attrs: tool.schema
          .record(tool.schema.string(), tool.schema.unknown())
          .optional(),
      }),
    )
    .optional()
    .describe('Nested blocks (one level deep)'),
});

const createTools = (waitForBrowser: WaitForBrowser) => ({
  'gutenberg-insert': tool({
    description:
      'Insert Gutenberg blocks directly into the WordPress editor. The user must have the editor open in their browser.',
    args: {
      blocks: tool.schema.array(blockSchema).describe('Blocks to insert'),
      position: tool.schema
        .number()
        .optional()
        .describe('Insert position (index)'),
    },
    async execute(args) {
      const result = await waitForBrowser<BlockOperationResult>(
        'gutenberg/insert-blocks',
        args,
      );
      if (!result.success) return `Failed: ${result.error}`;
      return `Inserted ${result.insertedCount} block(s).`;
    },
  }),

  'gutenberg-list': tool({
    description:
      'List all available Gutenberg block types. Use to discover what blocks exist before inserting.',
    args: {
      category: tool.schema.string().optional().describe('Filter by category'),
      search: tool.schema.string().optional().describe('Search by name'),
    },
    async execute(args) {
      const result = await waitForBrowser<{
        success: boolean;
        data?: BlockTypeInfo[];
        error?: string;
      }>('gutenberg/list-all-blocks', args);

      if (!result.success || !result.data) return `Failed: ${result.error}`;

      let blocks = result.data;
      if (args.category)
        blocks = blocks.filter((b) => b.category === args.category);
      if (args.search) {
        const s = args.search.toLowerCase();
        blocks = blocks.filter(
          (b) =>
            b.name.toLowerCase().includes(s) ||
            b.title.toLowerCase().includes(s),
        );
      }

      const core = blocks.filter((b) => b.name.startsWith('core/'));
      const plugin = blocks.filter((b) => !b.name.startsWith('core/'));
      let out = `Found ${blocks.length} blocks (${core.length} core, ${plugin.length} plugin).\n\n`;

      if (core.length > 0) {
        out += '## Core\n';
        for (const b of core.slice(0, 20)) {
          out += `- **${b.name}**: ${b.title}${b.description ? ` - ${b.description}` : ''}\n`;
        }
        if (core.length > 20) out += `... +${core.length - 20} more\n`;
      }
      if (plugin.length > 0) {
        out += '\n## Plugin\n';
        for (const b of plugin.slice(0, 10))
          out += `- **${b.name}**: ${b.title}\n`;
        if (plugin.length > 10) out += `... +${plugin.length - 10} more\n`;
      }
      return out;
    },
  }),

  'gutenberg-serialize': tool({
    description:
      'Serialize blocks to WordPress post content format (HTML with block comments).',
    args: {
      blocks: tool.schema.array(blockSchema).describe('Blocks to serialize'),
    },
    async execute(args) {
      const result = await waitForBrowser<BlockOperationResult>(
        'gutenberg/serialize-blocks',
        args,
      );
      if (!result.success) return `Failed: ${result.error}`;
      return `\`\`\`html\n${result.serialized}\n\`\`\``;
    },
  }),

  'gutenberg-blocks': tool({
    description: 'Get the current blocks in the WordPress editor.',
    args: {
      format: tool.schema
        .enum(['full', 'simplified'])
        .optional()
        .default('simplified')
        .describe('Output format'),
    },
    async execute(args) {
      const result = await waitForBrowser<{
        success: boolean;
        data?: BlockInstance[];
        error?: string;
      }>('gutenberg/get-current-blocks', args);

      if (!result.success || !result.data) return `Failed: ${result.error}`;
      const blocks = result.data;
      if (blocks.length === 0) return 'Editor is empty (no blocks).';

      if (args.format === 'full') {
        return `\`\`\`json\n${JSON.stringify(blocks, null, 2)}\n\`\`\``;
      }

      const fmt = (b: BlockInstance, indent = 0): string => {
        const pre = '  '.repeat(indent);
        const attrs = Object.entries(b.attributes || {})
          .filter(([k]) =>
            ['content', 'level', 'url', 'alt', 'align'].includes(k),
          )
          .map(([k, v]) => {
            const s = typeof v === 'string' ? v : JSON.stringify(v);
            return `${k}="${s.length > 50 ? `${s.slice(0, 50)}...` : s}"`;
          });
        let line = `${pre}- ${b.name}${attrs.length ? ` (${attrs.join(', ')})` : ''}\n`;
        for (const c of b.innerBlocks ?? []) line += fmt(c, indent + 1);
        return line;
      };

      return `Blocks (${blocks.length}):\n\n${blocks.map((b) => fmt(b)).join('')}`;
    },
  }),
});

export const WordForgeGutenbergPlugin: Plugin = async () => {
  const { waitForBrowser } = createBrowserServer(BROWSER_SERVER_PORT);
  return { tool: createTools(waitForBrowser) };
};

export default WordForgeGutenbergPlugin;

export { createBrowserServer } from './server';
export type { BrowserServer } from './server';
export type { WaitForBrowser, BlockSpec, BlockOperationResult } from './types';
