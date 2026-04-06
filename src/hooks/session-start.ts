import { LocalStore } from '../data/local-store.js';
import { computeStreak } from '../core/stats-aggregator.js';
import { calcStreakBonus } from '../core/exp-calculator.js';
import { getLevelInfo } from '../core/level-system.js';
import { autoSync } from '../data/auto-sync.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.claude-hp-mp');

async function main() {
  // Pull latest from remote first (in case another device updated)
  await autoSync();

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  const today = new Date().toISOString().split('T')[0];
  const newStreak = computeStreak(stats.streakDays, stats.lastActiveDate);
  const streakExp = calcStreakBonus(newStreak);

  stats.streakDays = newStreak;
  stats.lastActiveDate = today;
  stats.totalExp += streakExp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  // Push updated stats to remote
  await autoSync();
}

main().catch(console.error);
