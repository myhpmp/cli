import { LocalStore } from '../data/local-store.js';
import { calcTokenExp } from '../core/exp-calculator.js';
import { getLevelInfo } from '../core/level-system.js';
import { autoSyncIfDue } from '../data/auto-sync.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.claude-hp-mp');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const hookData = JSON.parse(input);
  const tokensUsed = hookData?.usage?.total_tokens ?? 0;
  if (tokensUsed === 0) return;

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  const exp = calcTokenExp(tokensUsed);
  stats.totalExp += exp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  // Sync every 5 minutes
  await autoSyncIfDue();
}

main().catch(console.error);
