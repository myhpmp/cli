import readline from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { AuthManager } from '../auth/auth-manager.js';

const DATA_DIR = path.join(os.homedir(), '.my-hp-mp');

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const authManager = new AuthManager(DATA_DIR);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('🌍 Select display language:\n');
  console.log('  1) 한국어 (Korean)');
  console.log('  2) English\n');

  const choice = await ask(rl, '> ');
  const locale = choice.trim() === '1' ? 'ko' : 'en';

  try {
    const config = await authManager.loadConfig();
    config.locale = locale;
    await authManager.saveConfig(config);
  } catch {
    // No config yet — create minimal one with just locale
    await authManager.saveConfig({
      userId: '',
      accessToken: '',
      refreshToken: '',
      provider: 'github',
      locale,
    });
  }

  const langName = locale === 'ko' ? '한국어' : 'English';
  console.log(`\n✅ Language set to ${langName}`);
  rl.close();
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
