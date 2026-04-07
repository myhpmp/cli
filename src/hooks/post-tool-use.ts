import { LocalStore } from '../data/local-store.js';
import { calcTokenExp } from '../core/exp-calculator.js';
import { getLevelInfo } from '../core/level-system.js';
import { autoSyncIfDue } from '../data/auto-sync.js';
import { logExp } from '../data/exp-logger.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.claude-hp-mp');
const MAX_INPUT_SIZE = 1_000_000; // 1MB

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > MAX_INPUT_SIZE) return;
  }

  const hookData = JSON.parse(input);
  const tokensUsed = Number(hookData?.usage?.total_tokens ?? 0);
  if (!Number.isFinite(tokensUsed) || tokensUsed <= 0) return;

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  const exp = Math.min(calcTokenExp(tokensUsed), 1000);
  if (exp <= 0) return;

  stats.totalExp += exp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  await logExp(exp, 'token_usage');

  // Sync every 5 minutes
  await autoSyncIfDue();
}

main().catch(console.error);
