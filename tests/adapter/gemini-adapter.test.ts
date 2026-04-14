import { describe, it, expect } from 'vitest';
import { GeminiAdapter } from '../../src/adapter/gemini-adapter.js';

describe('GeminiAdapter', () => {
  const adapter = new GeminiAdapter();

  it('has correct name', () => {
    expect(adapter.name).toBe('gemini');
  });

  it('does not support status line', () => {
    expect(adapter.supportsStatusLine).toBe(false);
  });

  it('parseHookTokens extracts totalTokenCount from AfterModel', async () => {
    const stdin = JSON.stringify({
      usageMetadata: {
        totalTokenCount: 8500,
        promptTokenCount: 6000,
        candidatesTokenCount: 2500,
      },
    });
    const tokens = await adapter.parseHookTokens('AfterModel', stdin);
    expect(tokens).toBe(8500);
  });

  it('parseHookTokens returns 0 for missing usageMetadata', async () => {
    const tokens = await adapter.parseHookTokens('AfterModel', JSON.stringify({ something: 'else' }));
    expect(tokens).toBe(0);
  });

  it('parseHookTokens returns 0 for invalid JSON', async () => {
    const tokens = await adapter.parseHookTokens('AfterModel', 'not json');
    expect(tokens).toBe(0);
  });

  it('generates hook config for ~/.gemini/settings.json', () => {
    const config = adapter.generateHookConfig('/dist');
    expect(config.settingsPath).toContain('.gemini');
    expect(config.settingsPath).toContain('settings.json');
    expect(config.hooks).toHaveProperty('AfterModel');
    expect(config.statusLine).toBeUndefined();
  });
});
