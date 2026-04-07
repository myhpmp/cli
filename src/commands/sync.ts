import os from 'node:os';
import path from 'node:path';
import { AuthManager } from '../auth/auth-manager.js';
import { LocalStore } from '../data/local-store.js';
import { SupabaseProvider } from '../data/providers/supabase.js';
import { SyncEngine } from '../data/sync-engine.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const DATA_DIR = path.join(os.homedir(), '.my-hp-mp');

async function main() {
  const authManager = new AuthManager(DATA_DIR);

  if (!(await authManager.isAuthenticated())) {
    console.error('❌ Not authenticated. Run "my-hp-mp init" first.');
    process.exit(1);
  }

  const config = await authManager.loadConfig();
  const store = new LocalStore(DATA_DIR);
  const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);
  await provider.setSession(config.accessToken, config.refreshToken);
  const engine = new SyncEngine(store, provider);

  console.log('📡 Syncing...');
  const result = await engine.sync(config.userId);
  console.log(`✅ Synced — Lv.${result.level} | EXP: ${result.totalExp} | Streak: ${result.streakDays}d`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Sync failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
