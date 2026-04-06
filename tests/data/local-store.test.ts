import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStore } from '../../src/data/local-store.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('LocalStore', () => {
  let store: LocalStore;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `claude-hp-mp-test-${Date.now()}`);
    store = new LocalStore(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('returns default stats when no data file exists', async () => {
    const stats = await store.load();
    expect(stats.totalExp).toBe(0);
    expect(stats.level).toBe(1);
    expect(stats.totalSessions).toBe(0);
    expect(stats.streakDays).toBe(0);
    expect(stats.lastActiveDate).toBeNull();
  });

  it('saves and loads stats', async () => {
    await store.save({
      totalExp: 500,
      level: 6,
      totalSessions: 10,
      streakDays: 3,
      lastActiveDate: '2026-04-06',
      weeklyExpBonusClaimed: false,
      updatedAt: new Date().toISOString(),
    });

    const stats = await store.load();
    expect(stats.totalExp).toBe(500);
    expect(stats.level).toBe(6);
    expect(stats.streakDays).toBe(3);
  });

  it('creates directory if it does not exist', async () => {
    const nested = path.join(testDir, 'nested', 'deep');
    const nestedStore = new LocalStore(nested);
    await nestedStore.save({
      totalExp: 0, level: 1, totalSessions: 0, streakDays: 0,
      lastActiveDate: null, weeklyExpBonusClaimed: false, updatedAt: new Date().toISOString(),
    });
    expect(fs.existsSync(path.join(nested, 'data.json'))).toBe(true);
  });
});
