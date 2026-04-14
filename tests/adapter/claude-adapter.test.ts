import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from '../../src/adapter/claude-adapter.js';

describe('ClaudeAdapter', () => {
  const adapter = new ClaudeAdapter();

  it('has correct name', () => {
    expect(adapter.name).toBe('claude');
  });

  it('supports status line', () => {
    expect(adapter.supportsStatusLine).toBe(true);
  });

  it('parseHookTokens extracts total from transcript', async () => {
    const transcript = [
      JSON.stringify({ message: { usage: { input_tokens: 100, output_tokens: 50 } } }),
      JSON.stringify({ message: { usage: { input_tokens: 200, output_tokens: 80 } } }),
    ].join('\n');
    const tokens = await adapter.parseHookTokens('PostToolUse', '{}', transcript);
    expect(tokens).toBe(430);
  });

  it('parseHookTokens returns 0 for invalid input', async () => {
    const tokens = await adapter.parseHookTokens('PostToolUse', 'invalid', undefined);
    expect(tokens).toBe(0);
  });

  it('generates hook config with correct events', () => {
    const config = adapter.generateHookConfig('/dist');
    expect(config.settingsPath).toContain('.claude');
    expect(config.hooks).toHaveProperty('PostToolUse');
    expect(config.hooks).toHaveProperty('SessionStart');
    expect(config.statusLine).toBeDefined();
  });
});
