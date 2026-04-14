// src/hooks/common/track-tokens.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { LocalStore } from '../../data/local-store.js';
import { calcTokenExp } from '../../core/exp-calculator.js';
import { getLevelInfo } from '../../core/level-system.js';
import { logExp } from '../../data/exp-logger.js';
import { autoSyncIfDue } from '../../data/auto-sync.js';

export interface TokenState {
  tokens: number;
  pendingTokens: number;
}

export interface TrackTokensOptions {
  dataDir: string;
  provider: string;
  currentTotal: number;
  skipSync?: boolean;
}

export interface TrackTokensResult {
  exp: number;
  baseline: boolean;
}

function tokenStatePath(dataDir: string, provider: string): string {
  return path.join(dataDir, `last-tokens-${provider}.json`);
}

export async function getTokenState(dataDir: string, provider: string): Promise<TokenState> {
  try {
    const raw = await fs.readFile(tokenStatePath(dataDir, provider), 'utf-8');
    const data = JSON.parse(raw);
    return { tokens: Number(data.tokens) || 0, pendingTokens: Number(data.pendingTokens) || 0 };
  } catch {
    return { tokens: 0, pendingTokens: 0 };
  }
}

export async function saveTokenState(dataDir: string, provider: string, state: TokenState): Promise<void> {
  await fs.writeFile(tokenStatePath(dataDir, provider), JSON.stringify(state), 'utf-8');
}

export async function trackTokens(options: TrackTokensOptions): Promise<TrackTokensResult> {
  const { dataDir, provider, currentTotal, skipSync } = options;

  if (currentTotal <= 0) return { exp: 0, baseline: false };

  const state = await getTokenState(dataDir, provider);
  const previousTotal = state.tokens;

  // First call in session — set baseline only
  if (previousTotal === 0) {
    await saveTokenState(dataDir, provider, { tokens: currentTotal, pendingTokens: 0 });
    return { exp: 0, baseline: true };
  }

  const deltaTokens = currentTotal - previousTotal;
  if (deltaTokens <= 0) {
    await saveTokenState(dataDir, provider, { tokens: currentTotal, pendingTokens: state.pendingTokens });
    return { exp: 0, baseline: false };
  }

  // Accumulate small deltas until they reach the EXP threshold
  const accumulated = state.pendingTokens + deltaTokens;
  const exp = Math.min(calcTokenExp(accumulated), 1000);

  if (exp <= 0) {
    await saveTokenState(dataDir, provider, { tokens: currentTotal, pendingTokens: accumulated });
    return { exp: 0, baseline: false };
  }

  // Flush: log EXP and reset pending
  await saveTokenState(dataDir, provider, { tokens: currentTotal, pendingTokens: 0 });

  const store = new LocalStore(dataDir);
  const stats = await store.load();
  stats.totalExp += exp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();
  await store.save(stats);

  await logExp(exp, 'token_usage', { tokens: accumulated, provider });

  if (!skipSync) {
    await autoSyncIfDue();
  }

  return { exp, baseline: false };
}
