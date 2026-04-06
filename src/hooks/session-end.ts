import { LocalStore } from '../data/local-store.js';
import { calcSessionExp } from '../core/exp-calculator.js';
import { getLevelInfo } from '../core/level-system.js';
import { autoSync } from '../data/auto-sync.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.claude-hp-mp');

async function main() {
  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  stats.totalSessions += 1;
  stats.totalExp += calcSessionExp();
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  // Push final session stats to remote
  await autoSync();
}

main().catch(console.error);
