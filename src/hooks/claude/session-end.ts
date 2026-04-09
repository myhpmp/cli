import { LocalStore } from '../../data/local-store.js';
import { calcSessionExp } from '../../core/exp-calculator.js';
import { getLevelInfo } from '../../core/level-system.js';
import { autoSync } from '../../data/auto-sync.js';
import { logExp } from '../../data/exp-logger.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

async function main() {
  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  // Reset daily session count if date changed
  const today = new Date().toISOString().slice(0, 10);
  if (stats.dailySessionDate !== today) {
    stats.dailySessionCount = 0;
    stats.dailySessionDate = today;
  }

  const sessionExp = calcSessionExp(stats.dailySessionCount);
  stats.dailySessionCount += 1;
  stats.totalSessions += 1;
  stats.totalExp += sessionExp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  await logExp(sessionExp, 'session_complete', { provider: 'claude' });

  // Push final session stats to remote
  await autoSync();
}

main().catch(console.error);
