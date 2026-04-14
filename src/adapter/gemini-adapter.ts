import path from 'node:path';
import os from 'node:os';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class GeminiAdapter implements ProviderAdapter {
  readonly name = 'gemini';
  readonly configDir = path.join(os.homedir(), '.gemini');
  readonly supportsStatusLine = false;

  async parseHookTokens(_hookEvent: string, stdin: string): Promise<number> {
    try {
      const data = JSON.parse(stdin);
      return Number(data?.usageMetadata?.totalTokenCount ?? 0);
    } catch {
      return 0;
    }
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hookCmd = `node "${path.join(distDir, 'hooks', 'gemini', 'after-model.js').replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'settings.json'),
      hooks: {
        AfterModel: [{ command: hookCmd }],
      },
    };
  }
}
