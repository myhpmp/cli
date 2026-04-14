import path from 'node:path';
import os from 'node:os';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class ClaudeAdapter implements ProviderAdapter {
  readonly name = 'claude';
  readonly configDir = path.join(os.homedir(), '.claude');
  readonly supportsStatusLine = true;

  async parseHookTokens(_hookEvent: string, _stdin: string, transcriptContent?: string): Promise<number> {
    if (!transcriptContent) return 0;
    let total = 0;
    const lines = transcriptContent.trimEnd().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const usage = entry?.message?.usage ?? entry?.usage;
        if (usage?.input_tokens !== undefined && usage?.output_tokens !== undefined) {
          total += (usage.input_tokens || 0) + (usage.output_tokens || 0);
        }
      } catch { /* skip malformed */ }
    }
    return total;
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hook = (file: string) => `node "${path.join(distDir, 'hooks', file).replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'settings.json'),
      hooks: {
        PostToolUse: [{ matcher: '', hooks: [{ type: 'command', command: hook('claude/post-tool-use.js') }] }],
        SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: hook('common/session-start.js') }] }],
      },
      statusLine: {
        type: 'command',
        command: `node "${path.join(distDir, 'statusline.js').replace(/\\/g, '/')}"`,
      },
    };
  }
}
