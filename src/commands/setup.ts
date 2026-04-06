/**
 * Auto-configure Claude Code hooks and status line.
 * Run: npx claude-hp-mp setup
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const DIST_DIR = path.join(os.homedir(), '.claude-hp-mp', 'dist');

interface ClaudeSettings {
  hooks?: Record<string, unknown[]>;
  statusLine?: unknown;
  [key: string]: unknown;
}

async function loadSettings(): Promise<ClaudeSettings> {
  try {
    const raw = await fs.readFile(CLAUDE_SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveSettings(settings: ClaudeSettings): Promise<void> {
  const dir = path.dirname(CLAUDE_SETTINGS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

async function copyDistFiles(): Promise<void> {
  // Copy compiled dist files to ~/.claude-hp-mp/dist/
  const srcDist = path.resolve(import.meta.dirname, '..');
  const targetDir = DIST_DIR;

  await fs.mkdir(targetDir, { recursive: true });

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

  await copyRecursive(srcDist, targetDir);
}

async function main() {
  console.log('🎮 Claude HP/MP Setup');
  console.log('━'.repeat(30));

  // Step 1: Copy dist files
  console.log('\n📦 Installing files to ~/.claude-hp-mp/dist/ ...');
  await copyDistFiles();
  console.log('   ✅ Done');

  // Step 2: Configure Claude Code settings
  console.log('\n⚙️  Configuring Claude Code settings...');
  const settings = await loadSettings();

  // Add hooks
  if (!settings.hooks) settings.hooks = {};

  const hooksConfig: Record<string, { matcher: string; hooks: { type: string; command: string }[] }[]> = {
    PostToolUse: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node ${path.join(DIST_DIR, 'hooks', 'post-tool-use.js').replace(/\\/g, '/')}`,
      }],
    }],
    SessionStart: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node ${path.join(DIST_DIR, 'hooks', 'session-start.js').replace(/\\/g, '/')}`,
      }],
    }],
    Stop: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node ${path.join(DIST_DIR, 'hooks', 'session-end.js').replace(/\\/g, '/')}`,
      }],
    }],
  };

  for (const [event, config] of Object.entries(hooksConfig)) {
    const existing = settings.hooks[event] as unknown[] | undefined;
    if (!existing) {
      settings.hooks[event] = config;
    } else {
      // Check if already configured
      const alreadyHas = JSON.stringify(existing).includes('claude-hp-mp');
      if (!alreadyHas) {
        (settings.hooks[event] as unknown[]).push(...config);
      }
    }
  }

  // Add status line
  settings.statusLine = {
    type: 'command',
    command: `node ${path.join(DIST_DIR, 'statusline.js').replace(/\\/g, '/')}`,
  };

  await saveSettings(settings);
  console.log('   ✅ Hooks configured (PostToolUse, SessionStart, Stop)');
  console.log('   ✅ Status line configured');

  console.log('\n🎉 Setup complete! Restart Claude Code to see the status line.');
  console.log('   Run "claude-hp-mp usage" to see your stats.\n');
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
