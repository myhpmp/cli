#!/usr/bin/env node

import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === '--version' || command === '-v') {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    console.log(`v${pkg.version}`);
    return;
  }

  if (command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  switch (command) {
    case 'init':
      await import('./commands/init.js');
      break;
    case 'setup':
      await import('./commands/setup.js');
      break;
    case 'usage':
    case 'status':
      await import('./commands/usage.js');
      break;
    case 'locale':
    case 'lang':
      await import('./commands/locale.js');
      break;
    case 'sync':
      await import('./commands/sync.js');
      break;
    case 'statusline':
      await import('./commands/statusline-toggle.js');
      break;
    case 'uninstall':
      await import('./commands/uninstall.js');
      break;
    case 'dashboard':
    case 'dash':
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — dashboard.ts will be created in a subsequent task
      await import('./commands/dashboard.js');
      break;
    default:
      showHelp();
      break;
  }
}

function showHelp() {
  console.log('🎮 My HP/MP - Gamified Usage Dashboard\n');
  console.log('Supported: Claude Code, Gemini CLI, Codex CLI\n');
  console.log('Commands:');
  console.log('  setup      — Configure hooks (select AI tools)');
  console.log('  init       — Set up authentication (cross-device sync)');
  console.log('  usage      — Show detailed usage stats');
  console.log('  dashboard  — Interactive TUI dashboard (provider breakdown)');
  console.log('  sync       — Manually sync stats to cloud');
  console.log('  statusline — Toggle status line on/off (Claude Code only)');
  console.log('  locale     — Change display language (한국어/English)');
  console.log('  uninstall  — Remove all hooks and settings');
  console.log('\nQuick start:');
  console.log('  myhpmp setup    # Configure AI tool hooks');
  console.log('  myhpmp locale   # Set language');
  console.log('  myhpmp init     # Enable cloud sync & web dashboard (recommended)');
}

main().catch(console.error);
