#!/usr/bin/env node

// For now, a simple arg-based router without commander dependency
const args = process.argv.slice(2);
const command = args[0];

async function main() {
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
    default:
      console.log('🎮 My HP/MP - Gamified Usage Dashboard\n');
      console.log('Commands:');
      console.log('  setup      — Configure Claude Code hooks & status line');
      console.log('  init       — Set up authentication (cross-device sync)');
      console.log('  usage      — Show detailed usage stats');
      console.log('  sync       — Manually sync stats to cloud');
      console.log('  statusline — Toggle status line (on/off)');
      console.log('  locale     — Change display language (한국어/English)');
      console.log('\nQuick start:');
      console.log('  npx my-hp-mp setup    # Auto-configure everything');
      console.log('  npx my-hp-mp locale   # Set language');
      console.log('  npx my-hp-mp init     # Optional: enable cross-device sync');
      break;
  }
}

main().catch(console.error);
