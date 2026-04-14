import fs from 'node:fs/promises';
import path from 'node:path';

export interface UserStats {
  totalExp: number;
  level: number;
  totalSessions: number;
  lastActiveDate: string | null;
  weeklyExpBonusClaimed: boolean;
  username: string | null;
  updatedAt: string;
}

const DEFAULT_STATS: UserStats = {
  totalExp: 0,
  level: 1,
  totalSessions: 0,
  lastActiveDate: null,
  weeklyExpBonusClaimed: false,
  username: null,
  updatedAt: new Date().toISOString(),
};

export class LocalStore {
  private filePath: string;

  constructor(dir: string) {
    this.filePath = path.join(dir, 'data.json');
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async load(): Promise<UserStats> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_STATS };
    }
  }

  async save(stats: UserStats): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(stats, null, 2), 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }
}
