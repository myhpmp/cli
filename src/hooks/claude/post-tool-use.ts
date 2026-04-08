import { LocalStore } from '../../data/local-store.js';
import { calcTokenExp } from '../../core/exp-calculator.js';
import { getLevelInfo } from '../../core/level-system.js';
import { autoSyncIfDue } from '../../data/auto-sync.js';
import { logExp } from '../../data/exp-logger.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');
const MAX_INPUT_SIZE = 1_000_000; // 1MB
const LAST_TOKENS_PATH = path.join(DATA_DIR, 'last-tokens.json');

async function getLastTokenCount(): Promise<number> {
  try {
    const raw = await fs.readFile(LAST_TOKENS_PATH, 'utf-8');
    return Number(JSON.parse(raw).tokens) || 0;
  } catch {
    return 0;
  }
}

async function saveLastTokenCount(tokens: number): Promise<void> {
  await fs.writeFile(LAST_TOKENS_PATH, JSON.stringify({ tokens }), 'utf-8');
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > MAX_INPUT_SIZE) return;
  }

  const hookData = JSON.parse(input);
  const transcriptPath = hookData?.transcript_path;
  if (!transcriptPath) return;

  // Read the last line of transcript to get current total tokens
  let currentTotal = 0;
  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trimEnd().split('\n');
    // Search from end for last usage entry
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const usage = entry?.message?.usage ?? entry?.usage;
        if (usage?.input_tokens !== undefined) {
          currentTotal =
            (usage.input_tokens || 0) +
            (usage.cache_creation_input_tokens || 0) +
            (usage.cache_read_input_tokens || 0) +
            (usage.output_tokens || 0);
          break;
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    return;
  }

  if (currentTotal <= 0) return;

  const previousTotal = await getLastTokenCount();
  await saveLastTokenCount(currentTotal);

  // First call in session — no delta to calculate
  if (previousTotal === 0) return;

  const deltaTokens = currentTotal - previousTotal;
  if (deltaTokens <= 0) return;

  const exp = Math.min(calcTokenExp(deltaTokens), 1000);
  if (exp <= 0) return;

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  stats.totalExp += exp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  await logExp(exp, 'token_usage', { tokens: deltaTokens, provider: 'claude' });

  // Sync every 5 minutes
  await autoSyncIfDue();
}

main().catch(console.error);
