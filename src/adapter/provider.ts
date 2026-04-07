/**
 * Provider adapter interface.
 * Each AI coding tool (Claude Code, Codex, etc.) implements this.
 */

export interface ProviderAdapter {
  /** Provider name */
  readonly name: string;

  /** Provider config directory (e.g. ~/.claude, ~/.codex) */
  readonly configDir: string;

  /** Whether this provider supports a status line */
  readonly supportsStatusLine: boolean;

  /** Extract token count from PostToolUse stdin JSON. Return 0 if not available. */
  parseToolUseTokens(stdin: string): number;

  /** Get total session tokens at session end (e.g. from JSONL transcript). Return 0 if not available. */
  getSessionTokens(): Promise<number>;

  /** Generate hook configuration for this provider's settings file */
  generateHookConfig(distDir: string): ProviderHookConfig;
}

export interface ProviderHookConfig {
  settingsPath: string;
  hooks: Record<string, unknown>;
  statusLine?: unknown;
}
