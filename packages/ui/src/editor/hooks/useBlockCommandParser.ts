import { useCallback, useRef } from '@wordpress/element';
import type { BlockCommand, BlockOperationResult } from '../types/gutenberg';
import { useBlockActions } from './useBlockActions';

const BLOCK_COMMAND_REGEX = /```wordforge-blocks\s*\n([\s\S]*?)\n```/g;

export interface ParsedBlockCommand {
  raw: string;
  command: BlockCommand | null;
  error?: string;
}

export interface UseBlockCommandParserResult {
  parseAndExecute: (text: string) => BlockOperationResult[];
  parseCommands: (text: string) => ParsedBlockCommand[];
  hasBlockCommands: (text: string) => boolean;
}

const parseBlockCommand = (jsonStr: string): ParsedBlockCommand => {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.action || typeof parsed.action !== 'string') {
      return {
        raw: jsonStr,
        command: null,
        error: 'Missing or invalid "action" field',
      };
    }

    const validActions = ['insert', 'replace', 'remove', 'serialize'];
    if (!validActions.includes(parsed.action)) {
      return {
        raw: jsonStr,
        command: null,
        error: `Invalid action "${parsed.action}". Must be one of: ${validActions.join(', ')}`,
      };
    }

    if (
      parsed.action !== 'remove' &&
      (!parsed.blocks || !Array.isArray(parsed.blocks))
    ) {
      return {
        raw: jsonStr,
        command: null,
        error: 'Missing or invalid "blocks" array',
      };
    }

    return {
      raw: jsonStr,
      command: parsed as BlockCommand,
    };
  } catch (err) {
    return {
      raw: jsonStr,
      command: null,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
};

export const useBlockCommandParser = (): UseBlockCommandParserResult => {
  const {
    insertBlocks,
    replaceSelectedBlock,
    removeSelectedBlock,
    serializeBlocks,
  } = useBlockActions();
  const executedCommandsRef = useRef<Set<string>>(new Set());

  const parseCommands = useCallback((text: string): ParsedBlockCommand[] => {
    const results: ParsedBlockCommand[] = [];
    const regex = new RegExp(BLOCK_COMMAND_REGEX.source, 'g');

    for (const match of text.matchAll(regex)) {
      const jsonStr = match[1].trim();
      results.push(parseBlockCommand(jsonStr));
    }

    return results;
  }, []);

  const hasBlockCommands = useCallback((text: string): boolean => {
    return BLOCK_COMMAND_REGEX.test(text);
  }, []);

  const parseAndExecute = useCallback(
    (text: string): BlockOperationResult[] => {
      const commands = parseCommands(text);
      const results: BlockOperationResult[] = [];

      for (const parsed of commands) {
        const commandKey = parsed.raw;
        if (executedCommandsRef.current.has(commandKey)) {
          continue;
        }

        if (!parsed.command) {
          results.push({
            success: false,
            error: parsed.error ?? 'Failed to parse command',
          });
          continue;
        }

        executedCommandsRef.current.add(commandKey);

        const { action, blocks } = parsed.command;

        switch (action) {
          case 'insert':
            if (blocks) {
              results.push(insertBlocks(blocks));
            }
            break;

          case 'replace':
            if (blocks) {
              results.push(replaceSelectedBlock(blocks));
            }
            break;

          case 'remove':
            results.push(removeSelectedBlock());
            break;

          case 'serialize':
            if (blocks) {
              results.push(serializeBlocks(blocks));
            }
            break;
        }
      }

      return results;
    },
    [
      parseCommands,
      insertBlocks,
      replaceSelectedBlock,
      removeSelectedBlock,
      serializeBlocks,
    ],
  );

  return {
    parseAndExecute,
    parseCommands,
    hasBlockCommands,
  };
};
