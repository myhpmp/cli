import { GeminiAdapter } from '../../adapter/gemini-adapter.js';
import { trackTokens } from '../common/track-tokens.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');
const MAX_INPUT_SIZE = 1_000_000;

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > MAX_INPUT_SIZE) return;
  }

  const adapter = new GeminiAdapter();
  const currentTotal = await adapter.parseHookTokens('AfterModel', input);
  if (currentTotal <= 0) return;

  await trackTokens({ dataDir: DATA_DIR, provider: 'gemini', currentTotal });
}

main().catch(() => {});
