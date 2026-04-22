/**
 * Logs EXP gains to exp_history table in Supabase.
 * On failure, queues locally for retry on next sync.
 */
import { AuthManager } from '../auth/auth-manager.js';
import { enqueue } from './pending-exp.js';
import { logError } from './logger.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

export async function logExp(amount: number, reason: string, metadata?: Record<string, unknown>): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;

  const entry = { amount, reason, timestamp: new Date().toISOString(), metadata };

  try {
    const authManager = new AuthManager(DATA_DIR);
    if (!(await authManager.isAuthenticated())) return;

    // Always reload config fresh — another hook may have just refreshed tokens
    const config = await authManager.loadConfig();
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../config.js');
    const { SupabaseProvider } = await import('./providers/supabase.js');
    const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
      await provider.setSession(config.accessToken, config.refreshToken);
    } catch (err) {
      await logError('logExp:setSession', err);
      // Reload config first — another concurrent hook may have already refreshed
      const fresh = await authManager.loadConfig();
      if (fresh.accessToken !== config.accessToken) {
        // Someone else refreshed — retry with the new tokens
        try {
          await provider.setSession(fresh.accessToken, fresh.refreshToken);
        } catch (err2) {
          await logError('logExp:setSession retry', err2);
          await enqueue(entry);
          return;
        }
      } else {
        // No concurrent refresh — try refreshing ourselves
        const refreshed = await provider.refreshSession(config.refreshToken);
        if (!refreshed) {
          await logError('logExp:refresh', new Error('Refresh returned null'));
          await enqueue(entry);
          return;
        }
        // Reload before save to merge with any concurrent changes (e.g. locale change)
        const latest = await authManager.loadConfig();
        await authManager.saveConfig({
          ...latest,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
      }
    }

    await provider.insertExpHistory(config.userId, { amount, reason, metadata });
  } catch (err) {
    await logError('logExp', err);
    // INSERT failed (network, rate limit, etc.) — queue for retry
    await enqueue(entry).catch((e) => logError('logExp:enqueue', e));
  }
}
