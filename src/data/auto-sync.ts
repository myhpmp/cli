/**
 * Auto-sync helper: flushes pending exp queue + pulls server state.
 * Server is the source of truth for totalExp (computed by DB trigger).
 * Silent fail — sync is optional and should never break hooks.
 */
import fs from 'node:fs/promises';
import { LocalStore } from './local-store.js';
import { SyncEngine } from './sync-engine.js';
import { AuthManager } from '../auth/auth-manager.js';
import { logError } from './logger.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');
const LAST_SYNC_PATH = path.join(DATA_DIR, 'last-sync.json');
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function shouldSync(): Promise<boolean> {
  try {
    const raw = await fs.readFile(LAST_SYNC_PATH, 'utf-8');
    const { timestamp } = JSON.parse(raw);
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return true;
    const elapsed = Date.now() - timestamp;
    if (elapsed < 0) return true;
    return elapsed >= SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

async function markSynced(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LAST_SYNC_PATH, JSON.stringify({ timestamp: Date.now() }), 'utf-8');
}

/**
 * Sync unconditionally (used by session-start, manual sync).
 */
export async function autoSync(): Promise<void> {
  try {
    const authManager = new AuthManager(DATA_DIR);
    if (!(await authManager.isAuthenticated())) return;

    // Always reload config fresh — another hook may have just refreshed tokens
    const config = await authManager.loadConfig();
    const store = new LocalStore(DATA_DIR);
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../config.js');
    const { SupabaseProvider } = await import('./providers/supabase.js');
    const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
      await provider.setSession(config.accessToken, config.refreshToken);
    } catch (err) {
      await logError('autoSync:setSession', err);
      // Reload config — another concurrent hook may have already refreshed
      const fresh = await authManager.loadConfig();
      if (fresh.accessToken !== config.accessToken) {
        try {
          await provider.setSession(fresh.accessToken, fresh.refreshToken);
        } catch (err2) {
          await logError('autoSync:setSession retry', err2);
          return;
        }
      } else {
        const refreshed = await provider.refreshSession(config.refreshToken);
        if (!refreshed) {
          await logError('autoSync:refresh', new Error('Refresh returned null'));
          return;
        }
        const latest = await authManager.loadConfig();
        await authManager.saveConfig({
          ...latest,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
      }
    }

    const engine = new SyncEngine(store, provider);
    await engine.sync(config.userId);
    await markSynced();
  } catch (err) {
    await logError('autoSync', err);
  }
}

/**
 * Sync only if 5+ minutes have passed since last sync (used by post-tool-use).
 */
export async function autoSyncIfDue(): Promise<void> {
  if (await shouldSync()) {
    await autoSync();
  }
}
