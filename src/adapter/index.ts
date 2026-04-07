export type { ProviderAdapter, ProviderHookConfig } from './provider.js';
export { ClaudeAdapter } from './claude-adapter.js';
export { CodexAdapter } from './codex-adapter.js';

import { ClaudeAdapter } from './claude-adapter.js';
import { CodexAdapter } from './codex-adapter.js';
import type { ProviderAdapter } from './provider.js';

const PROVIDERS: Record<string, () => ProviderAdapter> = {
  claude: () => new ClaudeAdapter(),
  codex: () => new CodexAdapter(),
};

export function getProvider(name: string): ProviderAdapter {
  const factory = PROVIDERS[name];
  if (!factory) throw new Error(`Unknown provider: ${name}. Supported: ${Object.keys(PROVIDERS).join(', ')}`);
  return factory();
}

export function listProviders(): string[] {
  return Object.keys(PROVIDERS);
}
