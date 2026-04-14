# Multi-Provider Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Code 외에 Gemini CLI, Codex CLI의 토큰 사용량을 자동 트래킹하고, 통합 EXP/레벨 + 프로바이더별 TUI 대시보드를 제공한다.

**Architecture:** 기존 `ProviderAdapter` 인터페이스를 확장하여 Gemini/Codex 어댑터를 추가하고, 각 프로바이더의 hook 시스템에 연동한다. Hook 엔트리포인트는 공통 로직을 공유하고, `exp_history`에 프로바이더 정보를 저장한다. `myhpmp dashboard` 명령어로 ink 기반 TUI에서 프로바이더별 사용량을 조회한다.

**Tech Stack:** TypeScript (ESM), Vitest, ink (React for CLI), ink-table

**Spec:** `docs/superpowers/specs/2026-04-14-multi-provider-tracking-design.md`

---

## File Structure

### New Files
- `src/adapter/gemini-adapter.ts` — Gemini CLI 어댑터
- `src/adapter/codex-adapter.ts` — Codex CLI 어댑터
- `src/hooks/gemini/after-model.ts` — Gemini AfterModel hook 엔트리포인트
- `src/hooks/codex/stop.ts` — Codex Stop hook 엔트리포인트
- `src/hooks/common/track-tokens.ts` — 공통 토큰 트래킹 로직 (중복 제거)
- `src/commands/dashboard.ts` — TUI 대시보드 명령어
- `tests/adapter/gemini-adapter.test.ts` — Gemini 어댑터 테스트
- `tests/adapter/codex-adapter.test.ts` — Codex 어댑터 테스트
- `tests/adapter/claude-adapter.test.ts` — Claude 어댑터 테스트 (기존 누락, 추가)
- `tests/hooks/common/track-tokens.test.ts` — 공통 토큰 트래킹 테스트

### Modified Files
- `src/adapter/provider.ts` — 인터페이스 확장 (`parseHookTokens`)
- `src/adapter/claude-adapter.ts` — 새 인터페이스 적용
- `src/adapter/index.ts` — Gemini/Codex 레지스트리 등록
- `src/hooks/claude/post-tool-use.ts` — 공통 로직을 `track-tokens.ts`로 추출
- `src/hooks/common/session-start.ts` — provider 파라미터 지원
- `src/commands/setup.ts` — 멀티 프로바이더 선택 UI
- `src/commands/usage.ts` — 프로바이더별 요약 추가
- `src/cli.ts` — `dashboard` 명령어 등록
- `package.json` — ink, ink-table 의존성 추가

---

## Task 1: ProviderAdapter 인터페이스 확장

**Files:**
- Modify: `src/adapter/provider.ts`
- Test: `tests/adapter/claude-adapter.test.ts` (Create)

- [ ] **Step 1: Write failing test for ClaudeAdapter with new interface**

```typescript
// tests/adapter/claude-adapter.test.ts
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

    const tokens = await adapter.parseHookTokens('PostToolUse', JSON.stringify({
      transcript_path: '/tmp/test-transcript.jsonl',
    }), transcript);

    expect(tokens).toBe(430); // 100+50+200+80
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adapter/claude-adapter.test.ts`
Expected: FAIL — `parseHookTokens` does not exist on ClaudeAdapter

- [ ] **Step 3: Update ProviderAdapter interface**

```typescript
// src/adapter/provider.ts
export interface ProviderAdapter {
  readonly name: string;
  readonly configDir: string;
  readonly supportsStatusLine: boolean;

  /**
   * Extract token count from hook input.
   * @param hookEvent - The hook event name (e.g. 'PostToolUse', 'AfterModel', 'Stop')
   * @param stdin - Raw stdin string from the hook
   * @param transcriptContent - Optional: pre-read transcript/rollout content
   * @returns Total tokens extracted
   */
  parseHookTokens(hookEvent: string, stdin: string, transcriptContent?: string): Promise<number>;

  generateHookConfig(distDir: string): ProviderHookConfig;
}

export interface ProviderHookConfig {
  settingsPath: string;
  hooks: Record<string, unknown>;
  statusLine?: unknown;
}
```

- [ ] **Step 4: Update ClaudeAdapter to implement new interface**

```typescript
// src/adapter/claude-adapter.ts
import path from 'node:path';
import os from 'node:os';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class ClaudeAdapter implements ProviderAdapter {
  readonly name = 'claude';
  readonly configDir = path.join(os.homedir(), '.claude');
  readonly supportsStatusLine = true;

  async parseHookTokens(_hookEvent: string, _stdin: string, transcriptContent?: string): Promise<number> {
    if (!transcriptContent) return 0;

    let total = 0;
    const lines = transcriptContent.trimEnd().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const usage = entry?.message?.usage ?? entry?.usage;
        if (usage?.input_tokens !== undefined && usage?.output_tokens !== undefined) {
          total += (usage.input_tokens || 0) + (usage.output_tokens || 0);
        }
      } catch {
        // Skip malformed lines
      }
    }
    return total;
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hook = (file: string) => `node "${path.join(distDir, 'hooks', file).replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'settings.json'),
      hooks: {
        PostToolUse: [{ matcher: '', hooks: [{ type: 'command', command: hook('claude/post-tool-use.js') }] }],
        SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: hook('common/session-start.js') }] }],
      },
      statusLine: {
        type: 'command',
        command: `node "${path.join(distDir, 'statusline.js').replace(/\\/g, '/')}"`,
      },
    };
  }
}
```

- [ ] **Step 5: Remove old parseToolUseTokens and getSessionTokens from interface**

The old methods (`parseToolUseTokens`, `getSessionTokens`) are replaced by `parseHookTokens`. Remove them from `provider.ts` and `claude-adapter.ts`. The old `parseToolUseTokens` was not called directly by hooks (post-tool-use.ts does its own parsing), so no other callers to update.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/adapter/claude-adapter.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/adapter/provider.ts src/adapter/claude-adapter.ts tests/adapter/claude-adapter.test.ts
git commit -m "refactor: extend ProviderAdapter interface with parseHookTokens"
```

---

## Task 2: GeminiAdapter 구현

**Files:**
- Create: `src/adapter/gemini-adapter.ts`
- Create: `tests/adapter/gemini-adapter.test.ts`

- [ ] **Step 1: Write failing tests for GeminiAdapter**

```typescript
// tests/adapter/gemini-adapter.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adapter/gemini-adapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement GeminiAdapter**

```typescript
// src/adapter/gemini-adapter.ts
import path from 'node:path';
import os from 'node:os';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class GeminiAdapter implements ProviderAdapter {
  readonly name = 'gemini';
  readonly configDir = path.join(os.homedir(), '.gemini');
  readonly supportsStatusLine = false;

  async parseHookTokens(_hookEvent: string, stdin: string): Promise<number> {
    try {
      const data = JSON.parse(stdin);
      return Number(data?.usageMetadata?.totalTokenCount ?? 0);
    } catch {
      return 0;
    }
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hookCmd = `node "${path.join(distDir, 'hooks', 'gemini', 'after-model.js').replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'settings.json'),
      hooks: {
        AfterModel: [{ command: hookCmd }],
      },
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/adapter/gemini-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapter/gemini-adapter.ts tests/adapter/gemini-adapter.test.ts
git commit -m "feat: add GeminiAdapter for Gemini CLI token tracking"
```

---

## Task 3: CodexAdapter 구현

**Files:**
- Create: `src/adapter/codex-adapter.ts`
- Create: `tests/adapter/codex-adapter.test.ts`

- [ ] **Step 1: Write failing tests for CodexAdapter**

```typescript
// tests/adapter/codex-adapter.test.ts
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
    // Sum of all turn.completed: (5000+200) + (8000+500) = 13700
    expect(tokens).toBe(13700);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adapter/codex-adapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CodexAdapter**

```typescript
// src/adapter/codex-adapter.ts
import path from 'node:path';
import os from 'node:os';
import type { ProviderAdapter, ProviderHookConfig } from './provider.js';

export class CodexAdapter implements ProviderAdapter {
  readonly name = 'codex';
  readonly configDir = path.join(os.homedir(), '.codex');
  readonly supportsStatusLine = false;

  async parseHookTokens(_hookEvent: string, _stdin: string, transcriptContent?: string): Promise<number> {
    if (!transcriptContent) return 0;

    let total = 0;
    const lines = transcriptContent.trimEnd().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'turn.completed' && entry.usage) {
          total += (entry.usage.input_tokens || 0) + (entry.usage.output_tokens || 0);
        }
      } catch {
        // Skip malformed lines
      }
    }
    return total;
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    const hookCmd = `node "${path.join(distDir, 'hooks', 'codex', 'stop.js').replace(/\\/g, '/')}"`;

    return {
      settingsPath: path.join(this.configDir, 'hooks.json'),
      hooks: {
        Stop: [{ command: hookCmd }],
      },
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/adapter/codex-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapter/codex-adapter.ts tests/adapter/codex-adapter.test.ts
git commit -m "feat: add CodexAdapter for Codex CLI token tracking"
```

---

## Task 4: Provider 레지스트리에 등록

**Files:**
- Modify: `src/adapter/index.ts`

- [ ] **Step 1: Update adapter registry**

```typescript
// src/adapter/index.ts
export type { ProviderAdapter, ProviderHookConfig } from './provider.js';
export { ClaudeAdapter } from './claude-adapter.js';
export { GeminiAdapter } from './gemini-adapter.js';
export { CodexAdapter } from './codex-adapter.js';

import { ClaudeAdapter } from './claude-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { CodexAdapter } from './codex-adapter.js';
import type { ProviderAdapter } from './provider.js';

const PROVIDERS: Record<string, () => ProviderAdapter> = {
  claude: () => new ClaudeAdapter(),
  gemini: () => new GeminiAdapter(),
  codex: () => new CodexAdapter(),
};

export function getProvider(name: string): ProviderAdapter {
  const factory = PROVIDERS[name];
  if (!factory) throw new Error(`Unknown provider: ${name}. Supported: ${Object.keys(PROVIDERS).join(', ')}`);
  return factory();
}

export function listProviders(): string[] {
  return Object.keys(PROVIDERS);
}
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `npm test`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/adapter/index.ts
git commit -m "feat: register Gemini and Codex adapters in provider registry"
```

---

## Task 5: 공통 토큰 트래킹 로직 추출

현재 `src/hooks/claude/post-tool-use.ts`에 있는 토큰 트래킹 로직(델타 계산, EXP 변환, 로컬 스토어 업데이트, logExp 호출)은 Gemini/Codex에서도 동일하게 사용된다. 공통 모듈로 추출한다.

**Files:**
- Create: `src/hooks/common/track-tokens.ts`
- Create: `tests/hooks/common/track-tokens.test.ts`
- Modify: `src/hooks/claude/post-tool-use.ts`

- [ ] **Step 1: Write failing test for trackTokens**

```typescript
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
        currentTotal: 5500, // delta = 500, below 1000 threshold
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
        currentTotal: 5800, // delta=800, accumulated=500+800=1300 → 1 EXP
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
        currentTotal: 3000, // negative delta (new session)
        skipSync: true,
      });
      expect(result.exp).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/hooks/common/track-tokens.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement track-tokens.ts**

```typescript
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
    return {
      tokens: Number(data.tokens) || 0,
      pendingTokens: Number(data.pendingTokens) || 0,
    };
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

  // First call — set baseline only
  if (previousTotal === 0) {
    await saveTokenState(dataDir, provider, { tokens: currentTotal, pendingTokens: 0 });
    return { exp: 0, baseline: true };
  }

  const deltaTokens = currentTotal - previousTotal;
  if (deltaTokens <= 0) {
    await saveTokenState(dataDir, provider, { tokens: currentTotal, pendingTokens: state.pendingTokens });
    return { exp: 0, baseline: false };
  }

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/hooks/common/track-tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Refactor claude/post-tool-use.ts to use track-tokens**

```typescript
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
```

- [ ] **Step 6: Run all tests to verify nothing broke**

Run: `npm test`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/common/track-tokens.ts tests/hooks/common/track-tokens.test.ts src/hooks/claude/post-tool-use.ts
git commit -m "refactor: extract common token tracking logic from Claude hook"
```

---

## Task 6: Gemini CLI hook 엔트리포인트

**Files:**
- Create: `src/hooks/gemini/after-model.ts`

- [ ] **Step 1: Implement Gemini AfterModel hook**

```typescript
// src/hooks/gemini/after-model.ts
import { GeminiAdapter } from '../../adapter/gemini-adapter.js';
import { trackTokens } from '../common/track-tokens.js';
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

  const adapter = new GeminiAdapter();
  const currentTotal = await adapter.parseHookTokens('AfterModel', input);
  if (currentTotal <= 0) return;

  await trackTokens({ dataDir: DATA_DIR, provider: 'gemini', currentTotal });
}

main().catch(() => {});
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/gemini/after-model.ts
git commit -m "feat: add Gemini CLI AfterModel hook entry point"
```

---

## Task 7: Codex CLI hook 엔트리포인트

**Files:**
- Create: `src/hooks/codex/stop.ts`

- [ ] **Step 1: Implement Codex Stop hook**

```typescript
// src/hooks/codex/stop.ts
import { CodexAdapter } from '../../adapter/codex-adapter.js';
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

  let transcriptPath: string | undefined;
  try {
    const hookData = JSON.parse(input);
    transcriptPath = hookData?.transcript_path;
  } catch {
    return;
  }

  if (!transcriptPath) return;

  let rolloutContent: string;
  try {
    rolloutContent = await fs.readFile(transcriptPath, 'utf-8');
  } catch {
    return;
  }

  const adapter = new CodexAdapter();
  const currentTotal = await adapter.parseHookTokens('Stop', input, rolloutContent);
  if (currentTotal <= 0) return;

  await trackTokens({ dataDir: DATA_DIR, provider: 'codex', currentTotal });
}

main().catch(() => {});
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/codex/stop.ts
git commit -m "feat: add Codex CLI Stop hook entry point"
```

---

## Task 8: session-start hook에 provider 지원

현재 `session-start.ts`는 `provider: 'claude'`를 하드코딩한다. 다른 프로바이더에서도 세션 시작 hook을 사용할 수 있도록 provider 인자를 지원한다.

**Files:**
- Modify: `src/hooks/common/session-start.ts`

- [ ] **Step 1: Update session-start to accept provider from argv**

```typescript
// src/hooks/common/session-start.ts
import { LocalStore } from '../../data/local-store.js';
import { computeStreak } from '../../core/stats-aggregator.js';
import { calcStreakBonus } from '../../core/exp-calculator.js';
import { getLevelInfo } from '../../core/level-system.js';
import { autoSync } from '../../data/auto-sync.js';
import { logExp } from '../../data/exp-logger.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

async function main() {
  const provider = process.argv[2] || 'claude';

  await autoSync();

  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  const today = new Date().toISOString().slice(0, 10);
  const isNewDay = stats.lastActiveDate !== today;
  const newStreak = computeStreak(stats.streakDays, stats.lastActiveDate);
  const streakExp = isNewDay ? calcStreakBonus(newStreak) : 0;

  stats.streakDays = newStreak;
  stats.lastActiveDate = today;
  stats.totalSessions += 1;
  stats.totalExp += streakExp;
  stats.level = getLevelInfo(stats.totalExp).level;
  stats.updatedAt = new Date().toISOString();

  await store.save(stats);

  if (streakExp > 0) {
    await logExp(streakExp, 'streak_bonus', { provider });
  }

  await autoSync();
}

main().catch(console.error);
```

- [ ] **Step 2: Update ClaudeAdapter to pass provider arg in SessionStart hook**

In `src/adapter/claude-adapter.ts`, update `generateHookConfig` so the SessionStart hook command includes the provider name:

Change the SessionStart hook command from:
```typescript
command: hook('common/session-start.js')
```
to:
```typescript
command: hook('common/session-start.js') + ' claude'
```

- [ ] **Step 3: Update GeminiAdapter to include SessionStart hook**

In `src/adapter/gemini-adapter.ts`, add a SessionStart entry to generateHookConfig:

```typescript
generateHookConfig(distDir: string): ProviderHookConfig {
  const hookCmd = (file: string, ...args: string[]) =>
    `node "${path.join(distDir, 'hooks', file).replace(/\\/g, '/')}"${args.length ? ' ' + args.join(' ') : ''}`;

  return {
    settingsPath: path.join(this.configDir, 'settings.json'),
    hooks: {
      AfterModel: [{ command: hookCmd('gemini/after-model.js') }],
      SessionStart: [{ command: hookCmd('common/session-start.js', 'gemini') }],
    },
  };
}
```

- [ ] **Step 4: Update CodexAdapter to include SessionStart hook**

In `src/adapter/codex-adapter.ts`, add a SessionStart entry to generateHookConfig:

```typescript
generateHookConfig(distDir: string): ProviderHookConfig {
  const hookCmd = (file: string, ...args: string[]) =>
    `node "${path.join(distDir, 'hooks', file).replace(/\\/g, '/')}"${args.length ? ' ' + args.join(' ') : ''}`;

  return {
    settingsPath: path.join(this.configDir, 'hooks.json'),
    hooks: {
      Stop: [{ command: hookCmd('codex/stop.js') }],
      SessionStart: [{ command: hookCmd('common/session-start.js', 'codex') }],
    },
  };
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/common/session-start.ts src/adapter/claude-adapter.ts src/adapter/gemini-adapter.ts src/adapter/codex-adapter.ts
git commit -m "feat: support provider parameter in session-start hook"
```

---

## Task 9: setup 명령어 멀티 프로바이더 UI

**Files:**
- Modify: `src/commands/setup.ts`

- [ ] **Step 1: Update setup.ts for multi-provider selection**

Replace the numbered list UI with a checkbox-style multi-select. Since we're keeping it simple (no external dep for prompts), use numbered multi-input:

```typescript
// src/commands/setup.ts — replace the provider selection section in main()

// Change the selection UI from:
//   1) claude
//   2) All
// To:
async function main() {
  const providers = listProviders();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('SIGINT', () => { console.log('\n❌ Cancelled.'); process.exit(130); });

  console.log('🎮 My HP/MP Setup');
  console.log('━'.repeat(30));

  console.log('\nSelect AI coding tools to configure (comma-separated):\n');
  providers.forEach((p, i) => console.log(`  ${i + 1}) ${p}`));
  console.log(`  ${providers.length + 1}) All\n`);
  console.log('Example: 1,2 or 3 for All\n');

  const choice = await ask(rl, '> ');
  rl.close();

  const trimmed = choice.trim();
  let selectedProviders: string[];

  const allNum = providers.length + 1;
  if (trimmed === String(allNum)) {
    selectedProviders = providers;
  } else {
    const nums = trimmed.split(',').map(s => parseInt(s.trim()));
    selectedProviders = nums
      .filter(n => n >= 1 && n <= providers.length)
      .map(n => providers[n - 1]);

    if (selectedProviders.length === 0) {
      console.error('❌ Invalid selection.');
      process.exit(1);
      return;
    }
  }

  await ensureRuntimeDir();

  for (const providerName of selectedProviders) {
    await setupProvider(providerName);
  }

  console.log('\n🎉 Setup complete!');
  for (const p of selectedProviders) {
    console.log(`   ✅ ${p} hooks configured`);
  }
  if (selectedProviders.includes('claude')) {
    console.log('   ✅ Status line will appear at the bottom of Claude Code after restart.');
  }
  console.log('\n📝 Next steps:');
  console.log('   1. Restart your AI coding tools');
  console.log('   2. myhpmp usage     — Check your RPG dashboard');
  console.log('   3. myhpmp init      — Enable cloud sync & web dashboard (recommended)\n');
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/setup.ts
git commit -m "feat: multi-provider selection in setup command"
```

---

## Task 10: usage 명령어에 프로바이더별 요약 추가

**Files:**
- Modify: `src/commands/usage.ts`

- [ ] **Step 1: Update usage command to show provider breakdown**

The `usage` command should show which providers are configured. Add provider info below the existing dashboard:

```typescript
// Add to the end of main() in src/commands/usage.ts, before console.log(output):

import { listProviders, getProvider } from '../adapter/index.js';
import fs from 'node:fs/promises';

// ... existing code ...

// After rendering the main detail view, show configured providers
const configuredProviders: string[] = [];
for (const name of listProviders()) {
  try {
    const provider = getProvider(name);
    const config = provider.generateHookConfig(PKG_DIST_DIR);
    await fs.access(config.settingsPath);
    configuredProviders.push(name);
  } catch {
    // Provider config file doesn't exist — not configured
  }
}

console.log(output);

if (configuredProviders.length > 0) {
  console.log(`\n🔗 ${ko ? '연결된 도구' : 'Connected tools'}: ${configuredProviders.join(', ')}`);
}
console.log(`💡 ${ko ? '상세 대시보드' : 'Interactive dashboard'}: myhpmp dashboard`);
```

Note: `PKG_DIST_DIR` is already defined in `setup.ts` pattern. Add it to `usage.ts`:

```typescript
const PKG_DIST_DIR = path.resolve(import.meta.dirname, '..');
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/usage.ts
git commit -m "feat: show connected providers in usage command"
```

---

## Task 11: CLI help 텍스트 업데이트

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add dashboard command and update help text**

```typescript
// src/cli.ts — add to switch statement:
    case 'dashboard':
    case 'dash':
      await import('./commands/dashboard.js');
      break;

// Update showHelp():
function showHelp() {
  console.log('🎮 My HP/MP - Gamified Usage Dashboard\n');
  console.log('Supported: Claude Code, Gemini CLI, Codex CLI\n');
  console.log('Commands:');
  console.log('  setup      — Configure hooks (select AI tools)');
  console.log('  init       — Set up authentication (cross-device sync)');
  console.log('  usage      — Show detailed usage stats');
  console.log('  dashboard  — Interactive TUI dashboard (provider breakdown)');
  console.log('  sync       — Manually sync stats to cloud');
  console.log('  statusline — Toggle status line on/off (Claude Code only)');
  console.log('  locale     — Change display language (한국어/English)');
  console.log('  uninstall  — Remove all hooks and settings');
  console.log('\nQuick start:');
  console.log('  myhpmp setup    # Configure AI tool hooks');
  console.log('  myhpmp locale   # Set language');
  console.log('  myhpmp init     # Enable cloud sync & web dashboard (recommended)');
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add dashboard command and update help for multi-provider"
```

---

## Task 12: ink 의존성 추가 및 TUI 대시보드 구현

**Files:**
- Modify: `package.json`
- Create: `src/commands/dashboard.ts`

- [ ] **Step 1: Install ink dependencies**

```bash
npm install ink ink-table react
npm install -D @types/react
```

- [ ] **Step 2: Update tsconfig.json for JSX**

In `tsconfig.json`, add JSX support:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    // ... existing options
  }
}
```

- [ ] **Step 3: Implement dashboard command**

```tsx
// src/commands/dashboard.tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { AuthManager } from '../auth/auth-manager.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

interface ExpRecord {
  date: string;
  tokens: number;
  exp: number;
}

interface ProviderData {
  name: string;
  records: ExpRecord[];
  totalTokens: number;
  totalExp: number;
}

async function fetchProviderData(): Promise<ProviderData[]> {
  const authManager = new AuthManager(DATA_DIR);
  if (!(await authManager.isAuthenticated())) {
    return [];
  }

  const config = await authManager.loadConfig();
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../config.js');
  const { SupabaseProvider } = await import('../data/providers/supabase.js');
  const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    await provider.setSession(config.accessToken, config.refreshToken);
  } catch {
    const refreshed = await provider.refreshSession(config.refreshToken);
    if (!refreshed) return [];
    await authManager.saveConfig({
      ...config,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    });
  }

  const history = await provider.getExpHistory(config.userId);
  if (!history || history.length === 0) return [];

  // Group by provider and date
  const grouped = new Map<string, Map<string, { tokens: number; exp: number }>>();

  for (const entry of history) {
    if (entry.reason !== 'token_usage') continue;
    const provName = (entry.metadata as Record<string, unknown>)?.provider as string ?? 'claude';
    const date = entry.created_at?.slice(0, 10) ?? 'unknown';
    const tokens = Number((entry.metadata as Record<string, unknown>)?.tokens ?? 0);

    if (!grouped.has(provName)) grouped.set(provName, new Map());
    const dateMap = grouped.get(provName)!;
    const existing = dateMap.get(date) ?? { tokens: 0, exp: 0 };
    existing.tokens += tokens;
    existing.exp += entry.amount;
    dateMap.set(date, existing);
  }

  const result: ProviderData[] = [];
  for (const [name, dateMap] of grouped) {
    const records = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    result.push({
      name,
      records,
      totalTokens: records.reduce((sum, r) => sum + r.tokens, 0),
      totalExp: records.reduce((sum, r) => sum + r.exp, 0),
    });
  }

  return result.sort((a, b) => b.totalExp - a.totalExp);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Dashboard() {
  const { exit } = useApp();
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderData().then(data => {
      setProviders(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useInput((input, key) => {
    if (input === 'q') exit();
    if (key.leftArrow) {
      setTabIndex(i => Math.max(0, i - 1));
      setScrollOffset(0);
    }
    if (key.rightArrow) {
      setTabIndex(i => Math.min(providers.length, i + 1)); // +1 for "All" tab
      setScrollOffset(0);
    }
    if (key.upArrow) setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow) setScrollOffset(o => o + 1);
  });

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (providers.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>No usage data found.</Text>
        <Text dimColor>Run &quot;myhpmp init&quot; to enable cloud sync, then use your AI tools.</Text>
      </Box>
    );
  }

  // Build tabs: "All" + each provider
  const tabs = ['All', ...providers.map(p => p.name)];

  // Get records for current tab
  let currentRecords: ExpRecord[];
  if (tabIndex === 0) {
    // "All" — merge all providers by date
    const merged = new Map<string, { tokens: number; exp: number }>();
    for (const p of providers) {
      for (const r of p.records) {
        const existing = merged.get(r.date) ?? { tokens: 0, exp: 0 };
        existing.tokens += r.tokens;
        existing.exp += r.exp;
        merged.set(r.date, existing);
      }
    }
    currentRecords = Array.from(merged.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } else {
    currentRecords = providers[tabIndex - 1]?.records ?? [];
  }

  const visibleRows = 15;
  const displayRecords = currentRecords.slice(scrollOffset, scrollOffset + visibleRows);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>📊 My HP/MP Dashboard</Text>
      </Box>

      {/* Tabs */}
      <Box gap={2} marginBottom={1}>
        {tabs.map((tab, i) => (
          <Text key={tab} bold={i === tabIndex} inverse={i === tabIndex}>
            {` ${tab} `}
          </Text>
        ))}
      </Box>

      {/* Table header */}
      <Box>
        <Text bold>
          {`${'Date'.padEnd(14)}${'Tokens'.padStart(12)}${'EXP'.padStart(8)}`}
        </Text>
      </Box>
      <Text>{'─'.repeat(34)}</Text>

      {/* Table rows */}
      {displayRecords.map(r => (
        <Box key={r.date}>
          <Text>
            {`${r.date.padEnd(14)}${formatNumber(r.tokens).padStart(12)}${String(r.exp).padStart(8)}`}
          </Text>
        </Box>
      ))}

      {currentRecords.length === 0 && (
        <Text dimColor>  No data for this provider</Text>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>←→ tab  ↑↓ scroll  q quit</Text>
      </Box>
    </Box>
  );
}

async function main() {
  render(<Dashboard />);
}

main().catch(console.error);
```

Note: The file extension must be `.tsx` for JSX. Update the import in `cli.ts`:

```typescript
case 'dashboard':
case 'dash':
  await import('./commands/dashboard.js'); // TSC compiles .tsx → .js
  break;
```

- [ ] **Step 4: Add getExpHistory to Supabase provider**

The dashboard needs to fetch exp_history from Supabase. Add `getExpHistory` method to the DB interface and Supabase provider.

In `src/data/providers/db-interface.ts`, add:
```typescript
export interface ExpHistoryEntry {
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// Add to DbProvider interface:
getExpHistory(userId: string): Promise<ExpHistoryEntry[]>;
```

In `src/data/providers/supabase.ts`, implement:
```typescript
async getExpHistory(userId: string): Promise<ExpHistoryEntry[]> {
  const { data, error } = await this.client
    .from('exp_history')
    .select('amount, reason, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error || !data) return [];
  return data as ExpHistoryEntry[];
}
```

- [ ] **Step 5: Verify build succeeds**

Run: `npm run build`
Expected: No errors

- [ ] **Step 6: Test manually**

Run: `node dist/cli.js dashboard`
Expected: TUI renders with tabs and table. Press ←→ to switch tabs, q to quit.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/commands/dashboard.tsx src/data/providers/db-interface.ts src/data/providers/supabase.ts src/cli.ts
git commit -m "feat: add interactive TUI dashboard with provider tabs"
```

---

## Task 13: last-tokens.json 마이그레이션

기존 `~/.myhpmp/last-tokens.json`은 프로바이더 구분 없이 단일 파일이다. 새 구조는 `last-tokens-claude.json`, `last-tokens-gemini.json` 등 프로바이더별 파일을 사용한다. 기존 파일을 Claude용으로 마이그레이션한다.

**Files:**
- Modify: `src/hooks/common/track-tokens.ts`

- [ ] **Step 1: Add migration logic to getTokenState**

```typescript
// Add to the top of getTokenState in src/hooks/common/track-tokens.ts:

export async function getTokenState(dataDir: string, provider: string): Promise<TokenState> {
  const providerPath = tokenStatePath(dataDir, provider);

  try {
    const raw = await fs.readFile(providerPath, 'utf-8');
    const data = JSON.parse(raw);
    return {
      tokens: Number(data.tokens) || 0,
      pendingTokens: Number(data.pendingTokens) || 0,
    };
  } catch {
    // Migration: if provider-specific file doesn't exist but old file does, migrate it
    if (provider === 'claude') {
      const legacyPath = path.join(dataDir, 'last-tokens.json');
      try {
        const raw = await fs.readFile(legacyPath, 'utf-8');
        const data = JSON.parse(raw);
        const state: TokenState = {
          tokens: Number(data.tokens) || 0,
          pendingTokens: Number(data.pendingTokens) || 0,
        };
        // Write to new location and remove legacy file
        await saveTokenState(dataDir, provider, state);
        await fs.unlink(legacyPath).catch(() => {});
        return state;
      } catch {
        // No legacy file either
      }
    }
    return { tokens: 0, pendingTokens: 0 };
  }
}
```

- [ ] **Step 2: Add migration test**

```typescript
// Add to tests/hooks/common/track-tokens.test.ts:

it('migrates legacy last-tokens.json for claude provider', async () => {
  const legacyPath = path.join(testDir, 'last-tokens.json');
  fs.writeFileSync(legacyPath, JSON.stringify({ tokens: 9000, pendingTokens: 300 }));

  const state = await getTokenState(testDir, 'claude');
  expect(state.tokens).toBe(9000);
  expect(state.pendingTokens).toBe(300);

  // Legacy file should be removed
  expect(fs.existsSync(legacyPath)).toBe(false);

  // New file should exist
  const newPath = path.join(testDir, 'last-tokens-claude.json');
  expect(fs.existsSync(newPath)).toBe(true);
});

it('does not migrate legacy file for non-claude providers', async () => {
  const legacyPath = path.join(testDir, 'last-tokens.json');
  fs.writeFileSync(legacyPath, JSON.stringify({ tokens: 9000, pendingTokens: 300 }));

  const state = await getTokenState(testDir, 'gemini');
  expect(state.tokens).toBe(0);
  expect(state.pendingTokens).toBe(0);
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/hooks/common/track-tokens.test.ts`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/common/track-tokens.ts tests/hooks/common/track-tokens.test.ts
git commit -m "feat: migrate legacy last-tokens.json to per-provider files"
```

---

## Task 14: CLAUDE.md 및 help 텍스트 업데이트

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Update the following sections:

In **Project Overview**, change:
```
- **Shared logic**: `@myhpmp/core` (level system, EXP calculator, tier data)
```

In **Project Structure**, add:
```
src/
├── adapter/           # Provider adapters (Claude, Gemini, Codex)
```

Update hooks section:
```
├── hooks/             # Hook entry points
│   ├── common/        # Shared hooks (session-start, track-tokens)
│   ├── claude/        # Claude-specific (post-tool-use, status-line-updater)
│   ├── gemini/        # Gemini CLI (after-model)
│   └── codex/         # Codex CLI (stop)
```

In **Commands Reference**, add:
```
myhpmp dashboard  — Interactive TUI dashboard (provider breakdown)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for multi-provider support"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | ProviderAdapter 인터페이스 확장 | `tests/adapter/claude-adapter.test.ts` | `provider.ts`, `claude-adapter.ts` |
| 2 | GeminiAdapter 구현 | `gemini-adapter.ts`, `test` | — |
| 3 | CodexAdapter 구현 | `codex-adapter.ts`, `test` | — |
| 4 | Provider 레지스트리 등록 | — | `index.ts` |
| 5 | 공통 토큰 트래킹 추출 | `track-tokens.ts`, `test` | `post-tool-use.ts` |
| 6 | Gemini hook 엔트리포인트 | `after-model.ts` | — |
| 7 | Codex hook 엔트리포인트 | `stop.ts` | — |
| 8 | session-start provider 지원 | — | `session-start.ts`, adapters |
| 9 | setup 멀티 프로바이더 UI | — | `setup.ts` |
| 10 | usage 프로바이더 요약 | — | `usage.ts` |
| 11 | CLI help 업데이트 | — | `cli.ts` |
| 12 | TUI 대시보드 구현 | `dashboard.tsx` | `package.json`, `tsconfig.json`, `db-interface.ts`, `supabase.ts` |
| 13 | last-tokens 마이그레이션 | — | `track-tokens.ts` |
| 14 | 문서 업데이트 | — | `CLAUDE.md` |
