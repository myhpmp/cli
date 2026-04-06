import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncEngine } from '../../src/data/sync-engine.js';
import { LocalStore, UserStats } from '../../src/data/local-store.js';
import type { DbProvider } from '../../src/data/providers/db-interface.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

class MockDbProvider implements DbProvider {
  private data: Map<string, UserStats> = new Map();

  async loadUserStats(userId: string): Promise<UserStats | null> {
    return this.data.get(userId) ?? null;
  }

  async saveUserStats(userId: string, stats: UserStats): Promise<void> {
    this.data.set(userId, stats);
  }
}

describe('SyncEngine', () => {
  let testDir: string;
  let localStore: LocalStore;
  let mockDb: MockDbProvider;
  let engine: SyncEngine;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `claude-hp-mp-sync-test-${Date.now()}`);
    localStore = new LocalStore(testDir);
    mockDb = new MockDbProvider();
    engine = new SyncEngine(localStore, mockDb);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('pushes local stats to remote', async () => {
    const stats: UserStats = {
      totalExp: 500, level: 6, totalSessions: 10, streakDays: 3,
      lastActiveDate: '2026-04-06', weeklyExpBonusClaimed: false,
      updatedAt: new Date().toISOString(),
    };
    await localStore.save(stats);

    await engine.push('user1');
    const remote = await mockDb.loadUserStats('user1');
    expect(remote?.totalExp).toBe(500);
  });

  it('pulls remote stats to local', async () => {
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

  it('sync resolves with last-write-wins', async () => {
    const older: UserStats = {
      totalExp: 500, level: 6, totalSessions: 10, streakDays: 3,
      lastActiveDate: '2026-04-05', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-05T12:00:00Z',
    };
    const newer: UserStats = {
      totalExp: 800, level: 9, totalSessions: 15, streakDays: 5,
      lastActiveDate: '2026-04-06', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-06T12:00:00Z',
    };

    await localStore.save(newer);
    await mockDb.saveUserStats('user1', older);

    await engine.sync('user1');
    const remote = await mockDb.loadUserStats('user1');
    expect(remote?.totalExp).toBe(800);
  });

  it('sync pulls from remote when local EXP is lower (data reset protection)', async () => {
    const localReset: UserStats = {
      totalExp: 0, level: 1, totalSessions: 0, streakDays: 0,
      lastActiveDate: null, weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-06T12:00:00Z', // newer timestamp but lower EXP
    };
    const remoteHigher: UserStats = {
      totalExp: 800, level: 9, totalSessions: 15, streakDays: 5,
      lastActiveDate: '2026-04-05', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-05T12:00:00Z',
    };

    await localStore.save(localReset);
    await mockDb.saveUserStats('user1', remoteHigher);

    const result = await engine.sync('user1');
    expect(result.totalExp).toBe(800);

    const local = await localStore.load();
    expect(local.totalExp).toBe(800);
  });

  it('sync pulls when remote is newer', async () => {
    const older: UserStats = {
      totalExp: 500, level: 6, totalSessions: 10, streakDays: 3,
      lastActiveDate: '2026-04-05', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-05T12:00:00Z',
    };
    const newer: UserStats = {
      totalExp: 800, level: 9, totalSessions: 15, streakDays: 5,
      lastActiveDate: '2026-04-06', weeklyExpBonusClaimed: false,
      updatedAt: '2026-04-06T12:00:00Z',
    };

    await localStore.save(older);
    await mockDb.saveUserStats('user1', newer);

    await engine.sync('user1');
    const local = await localStore.load();
    expect(local.totalExp).toBe(800);
  });
});
