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

interface TokenState {
  tokens: number;
  pendingTokens: number;
}

async function getTokenState(): Promise<TokenState> {
  try {
    const raw = await fs.readFile(LAST_TOKENS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return {
      tokens: Number(data.tokens) || 0,
      pendingTokens: Number(data.pendingTokens) || 0,
    };
  } catch {
    return { tokens: 0, pendingTokens: 0 };
  }
}

async function saveTokenState(state: TokenState): Promise<void> {
  await fs.writeFile(LAST_TOKENS_PATH, JSON.stringify(state), 'utf-8');
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

  // Sum all usage entries in transcript to get cumulative session tokens
  let currentTotal = 0;
  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trimEnd().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const usage = entry?.message?.usage ?? entry?.usage;
        if (usage?.input_tokens !== undefined && usage?.output_tokens !== undefined) {
          currentTotal +=
            (usage.input_tokens || 0) +
            (usage.output_tokens || 0);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    return;
  }

  if (currentTotal <= 0) return;

  const state = await getTokenState();
  const previousTotal = state.tokens;

  // First call in session — set baseline only
  if (previousTotal === 0) {
    await saveTokenState({ tokens: currentTotal, pendingTokens: 0 });
    return;
  }

  const deltaTokens = currentTotal - previousTotal;
  if (deltaTokens <= 0) {
    await saveTokenState({ tokens: currentTotal, pendingTokens: state.pendingTokens });
    return;
  }

  // Accumulate small deltas until they reach the EXP threshold
  const accumulated = state.pendingTokens + deltaTokens;
  const exp = Math.min(calcTokenExp(accumulated), 1000);

  if (exp <= 0) {
    await saveTokenState({ tokens: currentTotal, pendingTokens: accumulated });
    return;
  }

  // Flush: log EXP and reset pending
  await saveTokenState({ tokens: currentTotal, pendingTokens: 0 });

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  stats.totalExp += exp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  await logExp(exp, 'token_usage', { tokens: accumulated, provider: 'claude' });

  // Sync every 5 minutes
  await autoSyncIfDue();
}

main().catch(console.error);
