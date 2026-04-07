import path from 'node:path';
import os from 'node:os';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class ClaudeAdapter implements ProviderAdapter {
  readonly name = 'claude';
  readonly configDir = path.join(os.homedir(), '.claude');
  readonly supportsStatusLine = true;

  parseToolUseTokens(stdin: string): number {
    try {
      const data = JSON.parse(stdin);
      return Number(data?.usage?.total_tokens ?? 0);
    } catch {
      return 0;
    }
  }

  async getSessionTokens(): Promise<number> {
    // Claude tracks tokens per tool use via hooks, not at session end
    return 0;
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hook = (file: string) => `node "${path.join(distDir, 'hooks', file).replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'settings.json'),
      hooks: {
        PostToolUse: [{ matcher: '', hooks: [{ type: 'command', command: hook('claude/post-tool-use.js') }] }],
        SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: hook('common/session-start.js') }] }],
        Stop: [{ matcher: '', hooks: [{ type: 'command', command: hook('claude/session-end.js') }] }],
      },
      statusLine: {
        type: 'command',
        command: `node "${path.join(distDir, 'statusline.js').replace(/\\/g, '/')}"`,
      },
    };
  }
}
