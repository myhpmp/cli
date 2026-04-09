/**
 * Logs EXP gains to exp_history table in Supabase.
 * On failure, queues locally for retry on next sync.
 */
import { AuthManager } from '../auth/auth-manager.js';
import { enqueue } from './pending-exp.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

export async function logExp(amount: number, reason: string, metadata?: Record<string, unknown>): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;

  try {
    const authManager = new AuthManager(DATA_DIR);
    if (!(await authManager.isAuthenticated())) return;

    const config = await authManager.loadConfig();
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../config.js');
    const { SupabaseProvider } = await import('./providers/supabase.js');
    const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
      await provider.setSession(config.accessToken, config.refreshToken);
    } catch {
      const refreshed = await provider.refreshSession(config.refreshToken);
      if (!refreshed) {
        await enqueue({ amount, reason, timestamp: new Date().toISOString() });
        return;
      }
      await authManager.saveConfig({
        ...config,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      });
    }

    await provider.insertExpHistory(config.userId, { amount, reason, metadata });
  } catch {
    // INSERT failed (network, rate limit, etc.) — queue for retry
    await enqueue({ amount, reason, timestamp: new Date().toISOString() }).catch(() => {});
  }
}
