import type { UserStats } from '../local-store.js';

export interface ExpHistoryEntry {
  amount: number;
  reason: string;
}

export interface DbProvider {
  loadUserStats(userId: string): Promise<UserStats | null>;
  saveUserStats(userId: string, stats: UserStats): Promise<void>;
  insertExpHistory(userId: string, entry: ExpHistoryEntry): Promise<void>;
}
