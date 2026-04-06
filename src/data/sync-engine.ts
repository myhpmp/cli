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
    const local = await this.local.load();
    const remote = await this.remote.loadUserStats(userId);

    if (!remote) {
      await this.remote.saveUserStats(userId, local);
      return local;
    }

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
