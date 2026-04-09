/**
 * Remove all myhpmp hooks, status line config, and optionally local data.
 * Run: myhpmp uninstall
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { listProviders, getProvider } from '../adapter/index.js';

const RUNTIME_DIR = path.join(os.homedir(), '.myhpmp');

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function loadJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveJsonFile(filePath: string, data: Record<string, unknown>): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function removeMyhpmpHooks(hooks: Record<string, unknown[]>): Record<string, unknown[]> {
  const cleaned: Record<string, unknown[]> = {};
  for (const [event, entries] of Object.entries(hooks)) {
    const filtered = entries.filter(
      (entry) => !JSON.stringify(entry).includes('myhpmp'),
    );
    if (filtered.length > 0) {
      cleaned[event] = filtered;
    }
  }
  return cleaned;
}

async function removeProviderConfig(providerName: string): Promise<boolean> {
  const provider = getProvider(providerName);
  const config = provider.generateHookConfig('');
  const settingsPath = config.settingsPath;

  try {
    await fs.access(settingsPath);
  } catch {
    return false;
  }

  const settings = await loadJsonFile(settingsPath);
  let changed = false;

  // Remove hooks
  if (settings.hooks) {
    const before = JSON.stringify(settings.hooks);
    settings.hooks = removeMyhpmpHooks(settings.hooks as Record<string, unknown[]>);
    if (Object.keys(settings.hooks as Record<string, unknown>).length === 0) {
      delete settings.hooks;
    }
    if (JSON.stringify(settings.hooks) !== before) changed = true;
  }

  // Remove statusLine
  if (settings.statusLine && JSON.stringify(settings.statusLine).includes('myhpmp')) {
    delete settings.statusLine;
    changed = true;
  }

  if (changed) {
    await saveJsonFile(settingsPath, settings);
  }

  return changed;
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('🗑️  My HP/MP Uninstall');
  console.log('━'.repeat(30));

  // Remove hooks from all providers
  for (const providerName of listProviders()) {
    const removed = await removeProviderConfig(providerName);
    if (removed) {
      const provider = getProvider(providerName);
      const hookNames = Object.keys(provider.generateHookConfig('').hooks).join(', ');
      console.log(`\n⚙️  Removing ${providerName} hooks...`);
      console.log(`   ✅ Hooks removed (${hookNames})`);
      if (provider.supportsStatusLine) {
        console.log('   ✅ Status line removed');
      }
    }
  }

  // Ask about local data
  try {
    await fs.access(RUNTIME_DIR);
    console.log('');
    const answer = await ask(rl, 'Delete local data (~/.myhpmp)? This will remove all EXP/level data. (y/N) > ');
    if (answer.trim().toLowerCase() === 'y') {
      await fs.rm(RUNTIME_DIR, { recursive: true, force: true });
      console.log('   ✅ Local data deleted');
    } else {
      console.log('   ⏭️  Local data preserved');
    }
  } catch {
    // ~/.myhpmp doesn't exist
  }

  rl.close();

  console.log('\n🎉 Uninstall complete!');
  console.log('   Run "npm uninstall -g @myhpmp/cli" to remove the package.\n');
}

main().catch((err) => {
  console.error('❌ Uninstall failed:', err.message);
  process.exit(1);
});
