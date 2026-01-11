import type { OpenCodePlugin } from '../types';
import { AVAILABLE_PLUGINS } from './plugins';

export interface OAuthProvider {
  id: string;
  name: string;
  description: string;
  providerID: string;
  plugin: OpenCodePlugin | null;
  oauthLabel?: string;
  experimental?: boolean;
  color: string;
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Use your ChatGPT Plus/Pro subscription',
    providerID: 'openai',
    plugin: null,
    color: '#10a37f',
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    description: 'Use Gemini with your Google account',
    providerID: 'google',
    plugin:
      AVAILABLE_PLUGINS.find(
        (p) => p.packageName === 'opencode-gemini-auth@latest',
      ) ?? null,
    color: '#4285f4',
  },
  {
    id: 'anthropic',
    name: 'Claude',
    description: 'Use your Claude Pro/Max subscription',
    providerID: 'anthropic',
    plugin: null,
    oauthLabel: 'Claude Pro/Max',
    color: '#cc785c',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'Use your GitHub Copilot subscription',
    providerID: 'github-copilot',
    plugin: null,
    color: '#238636',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    description: 'Free Claude & Gemini via Google',
    providerID: 'google',
    plugin:
      AVAILABLE_PLUGINS.find(
        (p) => p.packageName === 'opencode-antigravity-auth@latest',
      ) ?? null,
    oauthLabel: 'Antigravity',
    experimental: true,
    color: '#9333ea',
  },
];

export function findOAuthMethodIndex(
  authMethods: Array<{ type: string; label: string }>,
  preferredLabel?: string,
): number {
  if (preferredLabel) {
    const labelIndex = authMethods.findIndex(
      (m) =>
        m.type === 'oauth' &&
        m.label.toLowerCase().includes(preferredLabel.toLowerCase()),
    );
    if (labelIndex >= 0) return labelIndex;
  }

  return authMethods.findIndex((m) => m.type === 'oauth');
}
