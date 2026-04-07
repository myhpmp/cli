import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { createReadStream } from 'node:fs';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class CodexAdapter implements ProviderAdapter {
  readonly name = 'codex';
  readonly configDir = path.join(os.homedir(), '.codex');
  readonly supportsStatusLine = false;

  parseToolUseTokens(_stdin: string): number {
    // Codex doesn't provide token data in hook stdin
    return 0;
  }

  /**
   * Parse the most recent Codex session JSONL to get total tokens used.
   * Reads token_count events and returns the last total_token_usage.total_tokens.
   */
  async getSessionTokens(): Promise<number> {
    try {
      const sessionFile = await this.findLatestSession();
      if (!sessionFile) return 0;

      let totalTokens = 0;

      const stream = createReadStream(sessionFile, 'utf-8');
      const rl = readline.createInterface({ input: stream });

      for await (const line of rl) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'event_msg' && entry.payload?.type === 'token_count') {
            const total = entry.payload.info?.total_token_usage?.total_tokens;
            if (typeof total === 'number') {
              totalTokens = total;
            }
          }
        } catch {
          // Skip malformed lines
        }
      }

      return totalTokens;
    } catch {
      return 0;
    }
  }

  private async findLatestSession(): Promise<string | null> {
    const sessionsDir = path.join(this.configDir, 'sessions');
    const isDigits = (s: string, len: number) => new RegExp(`^\\d{${len}}$`).test(s);
    try {
      const years = (await fs.readdir(sessionsDir)).filter(d => isDigits(d, 4));
      const latestYear = years.sort().pop();
      if (!latestYear) return null;

      const months = (await fs.readdir(path.join(sessionsDir, latestYear))).filter(d => isDigits(d, 2));
      const latestMonth = months.sort().pop();
      if (!latestMonth) return null;

      const days = (await fs.readdir(path.join(sessionsDir, latestYear, latestMonth))).filter(d => isDigits(d, 2));
      const latestDay = days.sort().pop();
      if (!latestDay) return null;

      const dayDir = path.join(sessionsDir, latestYear, latestMonth, latestDay);
      const files = (await fs.readdir(dayDir)).filter(f => f.endsWith('.jsonl')).sort();
      const latestFile = files.pop();
      if (!latestFile) return null;

      return path.join(dayDir, latestFile);
    } catch {
      return null;
    }
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hook = (file: string) => `node "${path.join(distDir, 'hooks', file).replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'hooks.json'),
      hooks: {
        SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: hook('common/session-start.js') }] }],
        Stop: [{ matcher: '', hooks: [{ type: 'command', command: hook('codex/session-end.js') }] }],
      },
    };
  }
}
