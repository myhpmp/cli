/**
 * Provider adapter interface.
 * Each AI coding tool (Claude Code, etc.) implements this.
 */

export interface ProviderAdapter {
  /** Provider name */
  readonly name: string;

  /** Provider config directory (e.g. ~/.claude) */
  readonly configDir: string;

  /** Whether this provider supports a status line */
  readonly supportsStatusLine: boolean;

  /** Extract token count from a hook event. Return 0 if not available. */
  parseHookTokens(hookEvent: string, stdin: string, transcriptContent?: string): Promise<number>;

  /** Generate hook configuration for this provider's settings file */
  generateHookConfig(distDir: string): ProviderHookConfig;
}

export interface ProviderHookConfig {
  settingsPath: string;
  hooks: Record<string, unknown>;
  statusLine?: unknown;
}
