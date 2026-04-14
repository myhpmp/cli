import { describe, it, expect } from 'vitest';
import { CodexAdapter } from '../../src/adapter/codex-adapter.js';

describe('CodexAdapter', () => {
  const adapter = new CodexAdapter();

  it('has correct name', () => {
    expect(adapter.name).toBe('codex');
  });

  it('does not support status line', () => {
    expect(adapter.supportsStatusLine).toBe(false);
  });

  it('parseHookTokens extracts tokens from rollout JSONL content', async () => {
    const rolloutContent = [
      JSON.stringify({ type: 'thread.started', thread_id: 'abc' }),
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 5000, output_tokens: 200, cached_input_tokens: 3000 } }),
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 8000, output_tokens: 500, cached_input_tokens: 5000 } }),
    ].join('\n');

    const tokens = await adapter.parseHookTokens('Stop', '{}', rolloutContent);
    expect(tokens).toBe(13700); // (5000+200) + (8000+500)
  });

  it('parseHookTokens returns 0 when no turn.completed events', async () => {
    const rolloutContent = JSON.stringify({ type: 'thread.started' });
    const tokens = await adapter.parseHookTokens('Stop', '{}', rolloutContent);
    expect(tokens).toBe(0);
  });

  it('parseHookTokens returns 0 for empty content', async () => {
    const tokens = await adapter.parseHookTokens('Stop', '{}', undefined);
    expect(tokens).toBe(0);
  });

  it('generates hook config for ~/.codex/hooks.json', () => {
    const config = adapter.generateHookConfig('/dist');
    expect(config.settingsPath).toContain('.codex');
    expect(config.settingsPath).toContain('hooks.json');
    expect(config.hooks).toHaveProperty('Stop');
    expect(config.statusLine).toBeUndefined();
  });
});
