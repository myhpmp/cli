/**
 * Auto-sync helper: pushes local stats to Supabase if user is authenticated.
 * Silent fail — sync is optional and should never break hooks.
 */
import fs from 'node:fs/promises';
import { LocalStore } from './local-store.js';
import { SyncEngine } from './sync-engine.js';
import { SupabaseProvider } from './providers/supabase.js';
import { AuthManager } from '../auth/auth-manager.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.claude-hp-mp');
const LAST_SYNC_PATH = path.join(DATA_DIR, 'last-sync.json');
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function shouldSync(): Promise<boolean> {
  try {
    const raw = await fs.readFile(LAST_SYNC_PATH, 'utf-8');
    const { timestamp } = JSON.parse(raw);
    return Date.now() - timestamp >= SYNC_INTERVAL_MS;
  } catch {
    return true; // No record = should sync
  }
}

async function markSynced(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LAST_SYNC_PATH, JSON.stringify({ timestamp: Date.now() }), 'utf-8');
}

/**
 * Sync unconditionally (used by session-start, session-end, manual sync).
 */
export async function autoSync(): Promise<void> {
  try {
    const authManager = new AuthManager(DATA_DIR);
    if (!(await authManager.isAuthenticated())) return;

    const config = await authManager.loadConfig();
    const store = new LocalStore(DATA_DIR);
    const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);
    await provider.setSession(config.accessToken, config.refreshToken);
    const engine = new SyncEngine(store, provider);

    await engine.sync(config.userId);
    await markSynced();
  } catch {
    // Silent fail — sync is best-effort
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
