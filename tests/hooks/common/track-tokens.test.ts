// tests/hooks/common/track-tokens.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { trackTokens, getTokenState, saveTokenState } from '../../../src/hooks/common/track-tokens.js';

describe('track-tokens', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `myhpmp-track-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('getTokenState / saveTokenState', () => {
    it('returns zero state when no file exists', async () => {
      const state = await getTokenState(testDir, 'claude');
      expect(state.tokens).toBe(0);
      expect(state.pendingTokens).toBe(0);
    });

    it('saves and loads state per provider', async () => {
      await saveTokenState(testDir, 'claude', { tokens: 5000, pendingTokens: 200 });
      await saveTokenState(testDir, 'gemini', { tokens: 3000, pendingTokens: 0 });

      const claudeState = await getTokenState(testDir, 'claude');
      expect(claudeState.tokens).toBe(5000);

      const geminiState = await getTokenState(testDir, 'gemini');
      expect(geminiState.tokens).toBe(3000);
    });
  });

  describe('trackTokens', () => {
    it('sets baseline on first call (previousTotal = 0)', async () => {
      const result = await trackTokens({
        dataDir: testDir,
        provider: 'claude',
        currentTotal: 5000,
        skipSync: true,
      });
      expect(result.exp).toBe(0);
      expect(result.baseline).toBe(true);

      const state = await getTokenState(testDir, 'claude');
      expect(state.tokens).toBe(5000);
    });

    it('accumulates tokens below EXP threshold', async () => {
      await saveTokenState(testDir, 'claude', { tokens: 5000, pendingTokens: 0 });

      const result = await trackTokens({
        dataDir: testDir,
        provider: 'claude',
        currentTotal: 5500,
        skipSync: true,
      });
      expect(result.exp).toBe(0);

      const state = await getTokenState(testDir, 'claude');
      expect(state.pendingTokens).toBe(500);
    });

    it('logs EXP when accumulated tokens reach threshold', async () => {
      await saveTokenState(testDir, 'claude', { tokens: 5000, pendingTokens: 500 });

      const result = await trackTokens({
        dataDir: testDir,
        provider: 'claude',
        currentTotal: 5800,
        skipSync: true,
      });
      expect(result.exp).toBe(1);

      const state = await getTokenState(testDir, 'claude');
      expect(state.pendingTokens).toBe(0);
    });

    it('ignores negative delta', async () => {
      await saveTokenState(testDir, 'claude', { tokens: 5000, pendingTokens: 0 });

      const result = await trackTokens({
        dataDir: testDir,
        provider: 'claude',
        currentTotal: 3000,
        skipSync: true,
      });
      expect(result.exp).toBe(0);
    });
  });
});
