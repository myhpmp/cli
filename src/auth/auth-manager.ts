import fs from 'node:fs/promises';
import path from 'node:path';

export interface AuthConfig {
  userId: string;
  accessToken: string;
  refreshToken: string;
  provider: 'github' | 'google';
  locale: string;
}

export class AuthManager {
  private configPath: string;

  constructor(configDir: string) {
    this.configPath = path.join(configDir, 'config.json');
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const config = await this.loadConfig();
      return !!config.userId && !!config.accessToken;
    } catch {
      return false;
    }
  }

  async loadConfig(): Promise<AuthConfig> {
    const raw = await fs.readFile(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.userId) {
      throw new Error('Invalid config.json format');
    }
    return parsed as AuthConfig;
  }

  async saveConfig(config: AuthConfig): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  async getUserId(): Promise<string> {
    const config = await this.loadConfig();
    return config.userId;
  }
}
