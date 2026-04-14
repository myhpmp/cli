import { CodexAdapter } from '../../adapter/codex-adapter.js';
import { trackTokens } from '../common/track-tokens.js';
import fs from 'node:fs/promises';
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

  let transcriptPath: string | undefined;
  try {
    const hookData = JSON.parse(input);
    transcriptPath = hookData?.transcript_path;
  } catch {
    return;
  }

  if (!transcriptPath) return;

  let rolloutContent: string;
  try {
    rolloutContent = await fs.readFile(transcriptPath, 'utf-8');
  } catch {
    return;
  }

  const adapter = new CodexAdapter();
  const currentTotal = await adapter.parseHookTokens('Stop', input, rolloutContent);
  if (currentTotal <= 0) return;

  await trackTokens({ dataDir: DATA_DIR, provider: 'codex', currentTotal });
}

main().catch(() => {});
