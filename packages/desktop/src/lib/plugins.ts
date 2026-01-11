import type { ProviderConfig } from '@opencode-ai/sdk/v2/client';
import type { OpenCodePlugin } from '../types';

const ANTIGRAVITY_PROVIDER_CONFIG: ProviderConfig = {
  models: {
    // Gemini from antigravity
    'antigravity-gemini-3-pro-low': {
      name: 'Gemini 3 Pro Low (Antigravity)',
      limit: { context: 1048576, output: 65535 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    'antigravity-gemini-3-pro-high': {
      name: 'Gemini 3 Pro High (Antigravity)',
      limit: { context: 1048576, output: 65535 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    'antigravity-gemini-3-flash': {
      name: 'Gemini 3 Flash (Antigravity)',
      limit: { context: 1048576, output: 65536 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    // Claude sonnet from antigravity
    'antigravity-claude-sonnet-4-5': {
      name: 'Claude Sonnet 4.5 (Antigravity)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    'antigravity-claude-sonnet-4-5-thinking-low': {
      name: 'Claude Sonnet 4.5 Think Low (Antigravity)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    'antigravity-claude-sonnet-4-5-thinking-medium': {
      name: 'Claude Sonnet 4.5 Think Medium (Antigravity)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    'antigravity-claude-sonnet-4-5-thinking-high': {
      name: 'Claude Sonnet 4.5 Think High (Antigravity)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    // Claude opus from anti gravity
    'antigravity-claude-opus-4-5-thinking-low': {
      name: 'Claude Opus 4.5 Think Low (Antigravity)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    'antigravity-claude-opus-4-5-thinking-medium': {
      name: 'Claude Opus 4.5 Think Medium (Antigravity)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
    'antigravity-claude-opus-4-5-thinking-high': {
      name: 'Claude Opus 4.5 Think High (Antigravity)',
      limit: { context: 200000, output: 64000 },
      modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
    },
  },
};

export const AVAILABLE_PLUGINS: OpenCodePlugin[] = [
  {
    id: 'antigravity',
    name: 'Google Auth',
    description: 'Gemini via Google',
    models: 'Gemini 3 Pro via OAuth',
    packageName: 'opencode-gemini-auth@latest',
    github: 'https://github.com/jenslys/opencode-gemini-auth',
    providerConfig: {
      google: ANTIGRAVITY_PROVIDER_CONFIG,
    },
  },
  {
    id: 'antigravity',
    name: 'Google Auth (unstable)',
    description: 'Free Claude & Gemini via Google',
    models: 'Sonnet 4.5, Opus, Gemini 3 Pro',
    packageName: 'opencode-antigravity-auth@latest',
    github: 'https://github.com/NoeFabris/opencode-antigravity-auth',
    providerConfig: {
      google: ANTIGRAVITY_PROVIDER_CONFIG,
    },
  },
];
