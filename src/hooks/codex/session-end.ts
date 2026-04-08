/**
 * Codex CLI session-end hook.
 * Parses the latest session JSONL to get total tokens, then logs all EXP at once.
 */
import { LocalStore } from '../../data/local-store.js';
import { calcTokenExp, calcSessionExp } from '../../core/exp-calculator.js';
import { getLevelInfo } from '../../core/level-system.js';
import { autoSync } from '../../data/auto-sync.js';
import { logExp } from '../../data/exp-logger.js';
import { CodexAdapter } from '../../adapter/codex-adapter.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

async function main() {
  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  // Session EXP
  const sessionExp = calcSessionExp();
  stats.totalSessions += 1;
  stats.totalExp += sessionExp;

  // Token EXP (parse Codex session JSONL)
  const codex = new CodexAdapter();
  const totalTokens = await codex.getSessionTokens();
  const tokenExp = Math.min(calcTokenExp(totalTokens), 1000);

  if (tokenExp > 0) {
    stats.totalExp += tokenExp;
  }

  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  // Log EXP to history
  await logExp(sessionExp, 'session_complete', { provider: 'codex' });
  if (tokenExp > 0) {
    await logExp(tokenExp, 'token_usage', { tokens: totalTokens, provider: 'codex' });
  }

  // Push to remote
  await autoSync();
}

main().catch(console.error);
