import path from 'node:path';
import os from 'node:os';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class CodexAdapter implements ProviderAdapter {
  readonly name = 'codex';
  readonly configDir = path.join(os.homedir(), '.codex');
  readonly supportsStatusLine = false;

  async parseHookTokens(_hookEvent: string, _stdin: string, transcriptContent?: string): Promise<number> {
    if (!transcriptContent) return 0;

    let total = 0;
    const lines = transcriptContent.trimEnd().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'turn.completed' && entry.usage) {
          total += (entry.usage.input_tokens || 0) + (entry.usage.output_tokens || 0);
        }
      } catch { /* skip malformed */ }
    }
    return total;
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hookCmd = `node "${path.join(distDir, 'hooks', 'codex', 'stop.js').replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'hooks.json'),
      hooks: {
        Stop: [{ command: hookCmd }],
      },
    };
  }
}
