/**
 * Frontend helpers for AI providers.
 *
 * Priority sorting and help information for known providers.
 * Providers themselves come from OpenCode server - this file only adds
 * metadata for better UX (priority, help URLs, placeholder hints).
 */

export interface ProviderMeta {
  priority: number;
  helpUrl: string;
  helpText: string;
  placeholder?: string;
}

/**
 * Known provider metadata.
 * Priority determines display order (lower = higher priority).
 * Providers not in this list will appear after known providers, sorted alphabetically.
 */
export const KNOWN_PROVIDERS: Record<string, ProviderMeta> = {
  // Tier 1: Primary providers (1-10)
  anthropic: {
    priority: 1,
    helpUrl: 'https://console.anthropic.com/',
    helpText: 'Sign up at console.anthropic.com, then create an API key.',
    placeholder: 'sk-ant-...',
  },
  openai: {
    priority: 2,
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Sign up at platform.openai.com, then create an API key.',
    placeholder: 'sk-...',
  },
  google: {
    priority: 3,
    helpUrl: 'https://aistudio.google.com/',
    helpText: 'Sign in at aistudio.google.com, then click "Get API Key".',
    placeholder: 'AI...',
  },
  opencode: {
    priority: 4,
    helpUrl: 'https://opencode.ai/zen',
    helpText: 'OpenCode Zen models are free - no API key required.',
    placeholder: '',
  },

  // Tier 2: Popular alternatives (11-20)
  openrouter: {
    priority: 11,
    helpUrl: 'https://openrouter.ai/keys',
    helpText: 'Sign up at openrouter.ai, then create an API key.',
    placeholder: 'sk-or-...',
  },
  groq: {
    priority: 12,
    helpUrl: 'https://console.groq.com/keys',
    helpText: 'Sign up at console.groq.com, then create an API key.',
    placeholder: 'gsk_...',
  },
  mistral: {
    priority: 13,
    helpUrl: 'https://console.mistral.ai/api-keys/',
    helpText: 'Sign up at console.mistral.ai, then create an API key.',
    placeholder: '',
  },
  xai: {
    priority: 14,
    helpUrl: 'https://console.x.ai/',
    helpText: 'Sign up at console.x.ai, then create an API key.',
    placeholder: 'xai-...',
  },
  deepseek: {
    priority: 15,
    helpUrl: 'https://platform.deepseek.com/api_keys',
    helpText: 'Sign up at platform.deepseek.com, then create an API key.',
    placeholder: 'sk-...',
  },

  // Tier 3: Other providers (21-30)
  together: {
    priority: 21,
    helpUrl: 'https://api.together.ai/settings/api-keys',
    helpText: 'Sign up at together.ai, then create an API key.',
    placeholder: '',
  },
  fireworks: {
    priority: 22,
    helpUrl: 'https://fireworks.ai/account/api-keys',
    helpText: 'Sign up at fireworks.ai, then create an API key.',
    placeholder: 'fw_...',
  },
  perplexity: {
    priority: 23,
    helpUrl: 'https://www.perplexity.ai/settings/api',
    helpText: 'Sign up at perplexity.ai, then create an API key.',
    placeholder: 'pplx-...',
  },
  cohere: {
    priority: 24,
    helpUrl: 'https://dashboard.cohere.com/api-keys',
    helpText: 'Sign up at cohere.com, then create an API key.',
    placeholder: '',
  },
  cerebras: {
    priority: 25,
    helpUrl: 'https://cloud.cerebras.ai/',
    helpText: 'Sign up at cloud.cerebras.ai, then create an API key.',
    placeholder: 'csk-...',
  },
  sambanova: {
    priority: 26,
    helpUrl: 'https://cloud.sambanova.ai/',
    helpText: 'Sign up at cloud.sambanova.ai, then create an API key.',
    placeholder: '',
  },
};

const DEFAULT_PROVIDER_META: ProviderMeta = {
  priority: 100,
  helpUrl: '',
  helpText: 'Check the provider documentation for API key instructions.',
  placeholder: '',
};

export const getProviderMeta = (providerId: string): ProviderMeta => {
  return KNOWN_PROVIDERS[providerId] ?? DEFAULT_PROVIDER_META;
};

export const sortProviders = <T extends { id: string }>(
  providers: T[],
): T[] => {
  return [...providers].sort((a, b) => {
    const aPriority = KNOWN_PROVIDERS[a.id]?.priority ?? 100;
    const bPriority = KNOWN_PROVIDERS[b.id]?.priority ?? 100;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Same priority tier - sort alphabetically
    return a.id.localeCompare(b.id);
  });
};

export const isKnownProvider = (providerId: string): boolean => {
  return providerId in KNOWN_PROVIDERS;
};
