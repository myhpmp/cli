import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const DIST_DIR = path.join(os.homedir(), '.myhpmp', 'dist');

interface ClaudeSettings {
  statusLine?: unknown;
  _statusLineBackup?: unknown;
  [key: string]: unknown;
}

async function loadSettings(): Promise<ClaudeSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveSettings(settings: ClaudeSettings): Promise<void> {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

const arg = process.argv[3]?.toLowerCase(); // setup → statusline → on|off

async function main() {
  const settings = await loadSettings();

  if (arg === 'on') {
    settings.statusLine = {
      type: 'command',
      command: `node ${path.join(DIST_DIR, 'statusline.js').replace(/\\/g, '/')}`,
    };
    delete settings._statusLineBackup;
    await saveSettings(settings);
    console.log('✅ Status line enabled. Restart Claude Code to apply.');
  } else if (arg === 'off') {
    if (settings.statusLine) {
      settings._statusLineBackup = settings.statusLine;
    }
    delete settings.statusLine;
    await saveSettings(settings);
    console.log('✅ Status line disabled. Restart Claude Code to apply.');
  } else {
    // Toggle
    if (settings.statusLine) {
      settings._statusLineBackup = settings.statusLine;
      delete settings.statusLine;
      await saveSettings(settings);
      console.log('✅ Status line disabled. Restart Claude Code to apply.');
    } else {
      settings.statusLine = settings._statusLineBackup || {
        type: 'command',
        command: `node ${path.join(DIST_DIR, 'statusline.js').replace(/\\/g, '/')}`,
      };
      delete settings._statusLineBackup;
      await saveSettings(settings);
      console.log('✅ Status line enabled. Restart Claude Code to apply.');
    }
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('ENOENT')) {
    console.error('❌ Claude settings not found. Run "myhpmp setup" first.');
  } else {
    console.error('❌ Failed:', msg);
  }
  process.exit(1);
});
