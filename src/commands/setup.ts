/**
 * Auto-configure hooks for supported AI coding tools.
 * Run: myhpmp setup
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { getProvider, listProviders } from '../adapter/index.js';

const DIST_DIR = path.join(os.homedir(), '.myhpmp', 'dist');

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function copyDistFiles(): Promise<void> {
  const srcDist = path.resolve(import.meta.dirname, '..');
  await fs.mkdir(DIST_DIR, { recursive: true });

  async function copyRecursive(src: string, dest: string) {
    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src);
      for (const entry of entries) {
        await copyRecursive(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      await fs.copyFile(src, dest);
    }
  }

  await copyRecursive(srcDist, DIST_DIR);
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
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function setupProvider(providerName: string): Promise<void> {
  const provider = getProvider(providerName);
  const config = provider.generateHookConfig(DIST_DIR);

  console.log(`\n⚙️  Configuring ${provider.name} hooks...`);
  const settings = await loadJsonFile(config.settingsPath);

  // Add hooks
  if (!settings.hooks) settings.hooks = {};
  const existingHooks = settings.hooks as Record<string, unknown[]>;

  for (const [event, hookConfig] of Object.entries(config.hooks)) {
    const existing = existingHooks[event] as unknown[] | undefined;
    if (!existing) {
      existingHooks[event] = hookConfig as unknown[];
    } else {
      const alreadyHas = JSON.stringify(existing).includes('myhpmp');
      if (!alreadyHas) {
        existing.push(...(hookConfig as unknown[]));
      }
    }
  }

  // Add status line (if supported)
  if (config.statusLine) {
    settings.statusLine = config.statusLine;
  }

  await saveJsonFile(config.settingsPath, settings);

  const hookNames = Object.keys(config.hooks).join(', ');
  console.log(`   ✅ Hooks configured (${hookNames})`);
  if (config.statusLine) {
    console.log('   ✅ Status line configured');
  }
}

async function main() {
  const providers = listProviders();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('🎮 My HP/MP Setup');
  console.log('━'.repeat(30));

  // Select provider(s)
  console.log('\nSelect AI coding tool to configure:\n');
  providers.forEach((p, i) => console.log(`  ${i + 1}) ${p}`));
  console.log(`  ${providers.length + 1}) All\n`);

  const choice = await ask(rl, '> ');
  rl.close();

  const choiceNum = parseInt(choice.trim());
  let selectedProviders: string[];

  if (choiceNum === providers.length + 1) {
    selectedProviders = providers;
  } else if (choiceNum >= 1 && choiceNum <= providers.length) {
    selectedProviders = [providers[choiceNum - 1]];
  } else {
    console.error('❌ Invalid selection.');
    process.exit(1);
    return;
  }

  // Step 1: Copy dist files
  console.log('\n📦 Installing files to ~/.myhpmp/dist/ ...');
  await copyDistFiles();
  console.log('   ✅ Done');

  // Step 2: Install runtime dependencies
  console.log('\n📦 Installing dependencies...');
  const pkgJson = { name: 'myhpmp-runtime', private: true, type: 'module', dependencies: { '@supabase/supabase-js': '^2' } };
  const runtimeDir = path.join(os.homedir(), '.myhpmp');
  await fs.writeFile(path.join(runtimeDir, 'package.json'), JSON.stringify(pkgJson, null, 2), 'utf-8');
  try {
    execSync('npm install --production --silent', { cwd: runtimeDir, stdio: 'pipe' });
    console.log('   ✅ Done');
  } catch {
    console.log('   ⚠️  Failed (sync features may not work)');
  }

  // Step 3: Configure each selected provider
  for (const providerName of selectedProviders) {
    await setupProvider(providerName);
  }

  console.log('\n🎉 Setup complete!');
  if (selectedProviders.includes('claude')) {
    console.log('   Restart Claude Code to see the status line.');
  }
  if (selectedProviders.includes('codex')) {
    console.log('   Restart Codex CLI to start tracking.');
  }
  console.log('   Run "myhpmp usage" to see your stats.');
  console.log('   Run "myhpmp init" to enable cloud sync & web dashboard (recommended)\n');
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
