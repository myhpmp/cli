import { LocalStore } from '../../data/local-store.js';
import { computeStreak } from '../../core/stats-aggregator.js';
import { calcStreakBonus } from '../../core/exp-calculator.js';
import { getLevelInfo } from '../../core/level-system.js';
import { autoSync } from '../../data/auto-sync.js';
import { logExp } from '../../data/exp-logger.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.my-hp-mp');

async function main() {
  // Pull latest from remote first (in case another device updated)
  await autoSync();

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const newStreak = computeStreak(stats.streakDays, stats.lastActiveDate);
  const streakExp = calcStreakBonus(newStreak);

  stats.streakDays = newStreak;
  stats.lastActiveDate = today;
  stats.totalExp += streakExp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  // Detect provider from parent process or config dir
  const provider = process.env.CODEX_HOME || process.env.CODEX_CONFIG_DIR ? 'codex' : 'claude';

  if (streakExp > 0) {
    await logExp(streakExp, 'streak_bonus', { provider });
  }

  // Push updated stats to remote
  await autoSync();
}

main().catch(console.error);
