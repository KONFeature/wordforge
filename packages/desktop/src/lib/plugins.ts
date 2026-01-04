import type { ProviderConfig } from '@opencode-ai/sdk/v2/client';
import type { OpenCodePlugin } from '../types';

const OPENAI_PROVIDER_CONFIG: ProviderConfig = {
  options: {
    reasoningEffort: 'medium',
    reasoningSummary: 'auto',
    textVerbosity: 'medium',
    include: ['reasoning.encrypted_content'],
    store: false,
  },
  models: {
    'gpt-5.2-none': {
      name: 'GPT 5.2 None (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'none',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-low': {
      name: 'GPT 5.2 Low (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-medium': {
      name: 'GPT 5.2 Medium (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-high': {
      name: 'GPT 5.2 High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'high',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-xhigh': {
      name: 'GPT 5.2 Extra High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'xhigh',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-codex-low': {
      name: 'GPT 5.2 Codex Low (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-codex-medium': {
      name: 'GPT 5.2 Codex Medium (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-codex-high': {
      name: 'GPT 5.2 Codex High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'high',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.2-codex-xhigh': {
      name: 'GPT 5.2 Codex Extra High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'xhigh',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-max-low': {
      name: 'GPT 5.1 Codex Max Low (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'low',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-max-medium': {
      name: 'GPT 5.1 Codex Max Medium (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'medium',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-max-high': {
      name: 'GPT 5.1 Codex Max High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'high',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-max-xhigh': {
      name: 'GPT 5.1 Codex Max Extra High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'xhigh',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-low': {
      name: 'GPT 5.1 Codex Low (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-medium': {
      name: 'GPT 5.1 Codex Medium (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-high': {
      name: 'GPT 5.1 Codex High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'high',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-mini-medium': {
      name: 'GPT 5.1 Codex Mini Medium (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-codex-mini-high': {
      name: 'GPT 5.1 Codex Mini High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'high',
        reasoningSummary: 'detailed',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-none': {
      name: 'GPT 5.1 None (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'none',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-low': {
      name: 'GPT 5.1 Low (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        textVerbosity: 'low',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-medium': {
      name: 'GPT 5.1 Medium (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        textVerbosity: 'medium',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
    'gpt-5.1-high': {
      name: 'GPT 5.1 High (OAuth)',
      limit: {
        context: 272000,
        output: 128000,
      },
      modalities: {
        input: ['text', 'image'],
        output: ['text'],
      },
      options: {
        reasoningEffort: 'high',
        reasoningSummary: 'detailed',
        textVerbosity: 'high',
        include: ['reasoning.encrypted_content'],
        store: false,
      },
    },
  },
};

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
    id: 'openai-codex',
    name: 'OpenAI Codex Auth',
    description: 'Use your ChatGPT Plus/Pro subscription',
    models: 'GPT-5.2 models via OAuth',
    packageName: 'opencode-openai-codex-auth@latest',
    github: "https://github.com/numman-ali/opencode-openai-codex-auth",
    providerConfig: {
      openai: OPENAI_PROVIDER_CONFIG,
    },
  },
  {
    id: 'antigravity',
    name: 'Google Auth',
    description: 'Gemini via Google',
    models: 'Gemini 3 Pro via OAuth',
    packageName: 'opencode-gemini-auth@latest',
    github: "https://github.com/jenslys/opencode-gemini-auth",
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
    github: "https://github.com/NoeFabris/opencode-antigravity-auth",
    providerConfig: {
      google: ANTIGRAVITY_PROVIDER_CONFIG,
    },
  },
];