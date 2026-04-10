import { LocalStore } from '../../data/local-store.js';
import { computeStreak } from '../../core/stats-aggregator.js';
import { calcStreakBonus } from '../../core/exp-calculator.js';
import { getLevelInfo } from '../../core/level-system.js';
import { autoSync } from '../../data/auto-sync.js';
import { logExp } from '../../data/exp-logger.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

async function main() {
  // Pull latest from remote first (in case another device updated)
  await autoSync();

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  const today = new Date().toISOString().slice(0, 10);
  const isNewDay = stats.lastActiveDate !== today;
  const newStreak = computeStreak(stats.streakDays, stats.lastActiveDate);
  const streakExp = isNewDay ? calcStreakBonus(newStreak) : 0;

  stats.streakDays = newStreak;
  stats.lastActiveDate = today;
  stats.totalSessions += 1;
  stats.totalExp += streakExp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  if (streakExp > 0) {
    await logExp(streakExp, 'streak_bonus', { provider: 'claude' });
  }

  // Push updated stats to remote
  await autoSync();
}

main().catch(console.error);
