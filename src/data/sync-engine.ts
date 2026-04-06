import { LocalStore, UserStats } from './local-store.js';
import type { DbProvider } from './providers/db-interface.js';

export class SyncEngine {
  constructor(
    private local: LocalStore,
    private remote: DbProvider,
  ) {}

  async push(userId: string): Promise<void> {
    const stats = await this.local.load();
    await this.remote.saveUserStats(userId, stats);
  }

  async pull(userId: string): Promise<void> {
    const stats = await this.remote.loadUserStats(userId);
    if (stats) {
      await this.local.save(stats);
    }
  }

  async sync(userId: string): Promise<UserStats> {
    const hasLocalData = await this.local.exists();
    const local = await this.local.load();
    const remote = await this.remote.loadUserStats(userId);

    // No remote data — push local (or default) to remote
    if (!remote) {
      await this.remote.saveUserStats(userId, local);
      return local;
    }

    // No local data file (fresh install) — always pull from remote
    if (!hasLocalData) {
      await this.local.save(remote);
      return remote;
    }

    // Local EXP is lower than remote — always pull (protects against data reset)
    if (local.totalExp < remote.totalExp) {
      await this.local.save(remote);
      return remote;
    }

    // Both exist — compare timestamps, last-write-wins
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();

    if (localTime >= remoteTime) {
      await this.remote.saveUserStats(userId, local);
      return local;
    } else {
      await this.local.save(remote);
      return remote;
    }
  }
}
