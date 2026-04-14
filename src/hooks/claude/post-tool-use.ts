// src/hooks/claude/post-tool-use.ts
import { ClaudeAdapter } from '../../adapter/claude-adapter.js';
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

  const hookData = JSON.parse(input);
  const transcriptPath = hookData?.transcript_path;
  if (!transcriptPath) return;

  let transcriptContent: string;
  try {
    transcriptContent = await fs.readFile(transcriptPath, 'utf-8');
  } catch {
    return;
  }

  const adapter = new ClaudeAdapter();
  const currentTotal = await adapter.parseHookTokens('PostToolUse', input, transcriptContent);
  if (currentTotal <= 0) return;

  await trackTokens({ dataDir: DATA_DIR, provider: 'claude', currentTotal });
}

main().catch(() => {});
