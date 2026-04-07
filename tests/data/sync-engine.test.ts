import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from '../../src/data/sync-engine.js';
import { LocalStore, UserStats } from '../../src/data/local-store.js';
import type { DbProvider, ExpHistoryEntry } from '../../src/data/providers/db-interface.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

class MockDbProvider implements DbProvider {
  private data: Map<string, UserStats> = new Map();
  private expHistory: { userId: string; amount: number; reason: string }[] = [];

  async loadUserStats(userId: string): Promise<UserStats | null> {
    return this.data.get(userId) ?? null;
  }

  async saveUserStats(userId: string, stats: UserStats): Promise<void> {
    this.data.set(userId, stats);
  }

  async insertExpHistory(userId: string, entry: ExpHistoryEntry): Promise<void> {
    this.expHistory.push({ userId, ...entry });
  }
}

describe('SyncEngine', () => {
  let testDir: string;
  let localStore: LocalStore;
  let mockDb: MockDbProvider;
  let engine: SyncEngine;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `my-hp-mp-sync-test-${Date.now()}`);
    localStore = new LocalStore(testDir);
    mockDb = new MockDbProvider();
    engine = new SyncEngine(localStore, mockDb);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('pull updates local from remote', async () => {
    const stats: UserStats = {
      totalExp: 1000, level: 11, totalSessions: 20, streakDays: 7,
      lastActiveDate: '2026-04-06', weeklyExpBonusClaimed: false,
      updatedAt: new Date().toISOString(),
    };
    await mockDb.saveUserStats('user1', stats);

    await engine.pull('user1');
    const local = await localStore.load();
    expect(local.totalExp).toBe(1000);
  });

  it('sync pulls server state as source of truth', async () => {
    const remote: UserStats = {
      totalExp: 800, level: 9, totalSessions: 15, streakDays: 5,
      lastActiveDate: '2026-04-06', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-06T12:00:00Z',
    };
    await mockDb.saveUserStats('user1', remote);

    // Local has inflated EXP (manipulation attempt)
    const local: UserStats = {
      totalExp: 99999, level: 50, totalSessions: 15, streakDays: 5,
      lastActiveDate: '2026-04-06', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-07T12:00:00Z',
    };
    await localStore.save(local);

    const result = await engine.sync('user1');
    // Server totalExp is truth (computed by DB trigger)
    expect(result.totalExp).toBe(800);
  });

  it('pushMetadata updates metadata but not totalExp', async () => {
    const remote: UserStats = {
      totalExp: 500, level: 6, totalSessions: 10, streakDays: 3,
      lastActiveDate: '2026-04-05', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-05T12:00:00Z',
    };
    await mockDb.saveUserStats('user1', remote);

    const local: UserStats = {
      totalExp: 99999, level: 50, totalSessions: 12, streakDays: 5,
      lastActiveDate: '2026-04-06', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-06T12:00:00Z',
    };
    await localStore.save(local);

    await engine.pushMetadata('user1');

    const updated = await mockDb.loadUserStats('user1');
    // Metadata updated
    expect(updated?.totalSessions).toBe(12);
    expect(updated?.streakDays).toBe(5);
    expect(updated?.lastActiveDate).toBe('2026-04-06');
    // totalExp preserved from remote (not overwritten by local)
    expect(updated?.totalExp).toBe(500);
  });

  it('sync returns local defaults when no remote data', async () => {
    const result = await engine.sync('user1');
    expect(result.totalExp).toBe(0);
    expect(result.level).toBe(1);
  });
});
