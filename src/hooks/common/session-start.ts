import { LocalStore } from '../../data/local-store.js';
import { getLevelInfo } from '../../core/level-system.js';
import { autoSync } from '../../data/auto-sync.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

async function main() {
  await autoSync();

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  const today = new Date().toISOString().slice(0, 10);

  stats.lastActiveDate = today;
  stats.totalSessions += 1;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  await autoSync();
}

main().catch(console.error);
