import { LocalStore, UserStats } from './local-store.js';
import { getLevelInfo } from '../core/level-system.js';
import type { DbProvider } from './providers/db-interface.js';
import { loadQueue, saveQueue, PendingExpEntry } from './pending-exp.js';
import { logError } from './logger.js';

export class SyncEngine {
  constructor(
    private local: LocalStore,
    private remote: DbProvider,
  ) {}

  /** Flush pending exp queue to remote exp_history. Keeps failed entries for retry. */
  async flushPendingExp(userId: string): Promise<void> {
    const queue = await loadQueue();
    if (queue.length === 0) return;

    const remaining: PendingExpEntry[] = [];
    for (const entry of queue) {
      try {
        await this.remote.insertExpHistory(userId, {
          amount: entry.amount,
          reason: entry.reason,
          metadata: entry.metadata,
        });
      } catch (err) {
        // Keep entry for next retry rather than silently losing data
        remaining.push(entry);
        await logError('flushPendingExp', err);
      }
    }
    await saveQueue(remaining);
  }

  /** Pull remote stats to local (server is always the source of truth) */
  async pull(userId: string): Promise<UserStats | null> {
    const remote = await this.remote.loadUserStats(userId);
    if (remote) {
      remote.level = getLevelInfo(remote.totalExp).level;
      await this.local.save(remote);
    }
    return remote;
  }

  /** Push metadata only (totalSessions, lastActiveDate) — NOT totalExp */
  async pushMetadata(userId: string): Promise<void> {
    const local = await this.local.load();
    const remote = await this.remote.loadUserStats(userId);
    if (!remote) return;

    // Only update metadata fields, preserve server-computed totalExp
    // Recompute level from totalExp (DB trigger only updates totalExp, not level)
    await this.remote.saveUserStats(userId, {
      ...remote,
      level: getLevelInfo(remote.totalExp).level,
      totalSessions: Math.max(local.totalSessions, remote.totalSessions),
      lastActiveDate: local.lastActiveDate && remote.lastActiveDate
        ? local.lastActiveDate > remote.lastActiveDate ? local.lastActiveDate : remote.lastActiveDate
        : local.lastActiveDate || remote.lastActiveDate,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Full sync: flush queue → push metadata → pull (server totalExp is truth) */
  async sync(userId: string): Promise<UserStats> {
    await this.flushPendingExp(userId);
    await this.pushMetadata(userId);

    const remote = await this.pull(userId);
    if (remote) return remote;

    // No remote data — return local defaults
    return this.local.load();
  }
}
