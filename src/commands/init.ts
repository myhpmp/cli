import readline from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { AuthManager } from '../auth/auth-manager.js';
import { signInWithOAuth, type OAuthResult } from '../auth/oauth.js';
import { LocalStore } from '../data/local-store.js';
import { SupabaseProvider } from '../data/providers/supabase.js';
import { SyncEngine } from '../data/sync-engine.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authManager = new AuthManager(DATA_DIR);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('SIGINT', () => { console.log('\n❌ Cancelled.'); process.exit(130); });

  // Check if already authenticated
  if (await authManager.isAuthenticated()) {
    const config = await authManager.loadConfig();
    const langName = config.locale === 'ko' ? '한국어' : 'English';
    console.log(`✅ Already authenticated (${config.provider})`);
    console.log(`   Language: ${langName}\n`);
    console.log('  1) Re-authenticate with a different account');
    console.log('  2) Change language');
    console.log('  3) Exit\n');

    const action = await ask(rl, '> ');
    if (action.trim() === '3' || !['1', '2'].includes(action.trim())) {
      rl.close();
      process.exit(0);
    }
    if (action.trim() === '2') {
      console.log('\n🌍 Select display language:\n');
      console.log('  1) 한국어 (Korean)');
      console.log('  2) English\n');
      const langChoice = await ask(rl, '> ');
      config.locale = langChoice.trim() === '1' ? 'ko' : 'en';
      await authManager.saveConfig(config);
      console.log(`\n✅ Language updated!`);
      rl.close();
      process.exit(0);
    }
    // action === '1' — fall through to re-auth
  }

  console.log('🎮 My HP/MP Setup');
  console.log('━'.repeat(24));
  console.log('🌐 Opening GitHub auth page in browser...\n');

  let result: OAuthResult;
  try {
    result = await signInWithOAuth(supabase, 'github');
  } catch (err) {
    rl.close();
    throw err;
  }
  const provider = 'github';

  console.log('\n🌍 Select display language:\n');
  console.log('  1) 한국어 (Korean)');
  console.log('  2) English\n');
  const langChoice = await ask(rl, '> ');
  const locale = langChoice.trim() === '1' ? 'ko' : 'en';

  await authManager.saveConfig({
    userId: result.userId,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    provider,
    locale,
  });

  // Create initial user_stats row in Supabase + sync local data
  console.log('\n📡 Syncing with cloud...');
  try {
    const store = new LocalStore(DATA_DIR);
    const dbProvider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);
    await dbProvider.setSession(result.accessToken, result.refreshToken);
    const engine = new SyncEngine(store, dbProvider);
    await engine.sync(result.userId);

    // Set GitHub username if not already set
    const stats = await store.load();
    if (!stats.username && result.username) {
      const ok = await dbProvider.setUsername(result.userId, result.username);
      if (ok) {
        stats.username = result.username;
        await store.save(stats);
      }
    }

    console.log('   ✅ Synced');
  } catch {
    console.log('   ⚠️  Sync failed (will retry on next session)');
  }

  console.log(`\n✅ Authentication complete!`);
  console.log(`📁 Config saved: ${DATA_DIR}/config.json`);
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Init failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
