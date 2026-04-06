import type { UserStats } from '../local-store.js';

export interface DbProvider {
  loadUserStats(userId: string): Promise<UserStats | null>;
  saveUserStats(userId: string, stats: UserStats): Promise<void>;
}
