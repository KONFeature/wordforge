import { WordForgeChatConfig } from '../types';

export class ChatApiClient {
  private config: WordForgeChatConfig;

  constructor(config: WordForgeChatConfig) {
    this.config = config;
  }

  private getUrl(path: string): string {
    const baseUrl = this.config.proxyUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = this.getUrl(path);
    const headers = {
      'X-WP-Nonce': this.config.nonce,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 204) {
      return null as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  getEventSource(): EventSource {
    const url = this.getUrl('event') + '?_wf_nonce=' + encodeURIComponent(this.config.nonce);
    return new EventSource(url, { withCredentials: true });
  }
}
