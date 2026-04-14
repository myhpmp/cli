# Multi-Provider Tracking Design

## Overview

Claude Code 외에 Gemini CLI, Codex CLI 등 다른 AI 코딩 도구의 토큰 사용량을 트래킹하여 통합 EXP/레벨 시스템으로 관리한다. 웹 대시보드에서는 프로바이더별 사용량을 분리해서 볼 수 있다.

## Goals

- 여러 AI 코딩 도구의 토큰 사용량을 자동으로 트래킹
- EXP와 레벨은 통합 (하나의 캐릭터)
- exp_history에 프로바이더 정보 저장 → 웹에서 툴별 분석 가능
- CLI에서 인터랙티브 TUI 대시보드로 프로바이더별 사용량 조회
- 기존 Claude Code 트래킹과 하위 호환 유지

## Non-Goals

- Cursor 지원 (현재 hook에 토큰 데이터 미포함, 추후 지원 시 추가)
- Input/Output 토큰 세분화 (MVP 이후)
- Cost 계산
- 수동 토큰 입력 명령어

## Supported Providers

### Claude Code (기존)

- **Hook 이벤트**: `PostToolUse`
- **토큰 소스**: hook stdin → JSONL의 `usage.input_tokens + output_tokens`
- **변경 사항**: exp_history metadata에 `provider: 'claude'` 명시 (기존에도 포함됨)

### Gemini CLI (신규)

- **Hook 이벤트**: `AfterModel`
- **Hook 설정 위치**: `~/.gemini/settings.json` → `hooks.AfterModel`
- **토큰 소스**: hook stdin JSON → `usageMetadata.totalTokenCount`
- **세션 파일 위치**: `~/.gemini/tmp/<project_hash>/chats/session-*.json` (fallback 참고용)
- **참고**: Gemini CLI hook은 Claude Code와 거의 동일한 아키텍처. stdin으로 JSON 수신, stdout으로 JSON 응답.

### Codex CLI (신규)

- **Hook 이벤트**: `Stop`
- **Hook 설정 위치**: `~/.codex/hooks.json` → `Stop` 이벤트
- **토큰 소스**: hook stdin에서 `transcript_path` 수신 → 해당 rollout JSONL 파일 파싱
- **Rollout 파일 위치**: `~/.codex/sessions/YYYY/MM/DD/rollout-<session_id>.jsonl`
- **토큰 추출**: `turn.completed` 이벤트의 `usage.input_tokens`, `usage.output_tokens`, `usage.cached_input_tokens` 합산. 또는 `token_count` 이벤트의 누적값에서 마지막 스냅샷 사용.
- **참고**: Codex hook stdin에는 토큰이 직접 안 들어옴. `transcript_path`를 통해 간접 접근.

## Architecture

```
[Claude Code PostToolUse]  ──▶ claude-adapter.parseToolUseTokens(stdin)
[Gemini CLI AfterModel]    ──▶ gemini-adapter.parseToolUseTokens(stdin)
[Codex CLI Stop]           ──▶ codex-adapter.parseStopTokens(stdin)
                                       │
                                       ▼
                            calcTokenExp() → logExp()
                            exp_history { provider, source: 'auto', tokens }
                                       │
                                       ▼
                            통합 EXP / 레벨 (하나의 캐릭터)
```

## Adapter Changes

### ProviderAdapter Interface 확장

현재 인터페이스:

```typescript
interface ProviderAdapter {
  readonly name: string;
  readonly configDir: string;
  readonly supportsStatusLine: boolean;
  parseToolUseTokens(stdin: string): number;
  getSessionTokens(): Promise<number>;
  generateHookConfig(distDir: string): ProviderHookConfig;
}
```

Codex CLI는 PostToolUse가 아닌 Stop hook에서 rollout 파일을 파싱해야 하므로, 인터페이스에 유연성이 필요할 수 있다. 방법:

- **Option A**: `parseToolUseTokens`를 범용 `parseHookTokens(hookEvent: string, stdin: string): number | Promise<number>`로 변경
- **Option B**: Codex adapter의 `parseToolUseTokens`에서 내부적으로 파일 읽기 수행 (비동기 필요)

**결정**: Option A — hook 이벤트 타입을 받아서 각 어댑터가 적절히 처리하도록 한다. 기존 `parseToolUseTokens`는 deprecated하고 `parseHookTokens`로 전환.

```typescript
interface ProviderAdapter {
  readonly name: string;
  readonly configDir: string;
  readonly supportsStatusLine: boolean;
  parseHookTokens(hookEvent: string, stdin: string): Promise<number>;
  generateHookConfig(distDir: string): ProviderHookConfig;
}
```

`getSessionTokens()`는 제거 (현재 Claude adapter에서도 0 반환).

### 새 어댑터 구현

**GeminiAdapter** (`src/adapter/gemini-adapter.ts`):

```typescript
class GeminiAdapter implements ProviderAdapter {
  readonly name = 'gemini';
  readonly configDir = path.join(os.homedir(), '.gemini');
  readonly supportsStatusLine = false;

  async parseHookTokens(hookEvent: string, stdin: string): Promise<number> {
    // AfterModel: stdin JSON에서 usageMetadata.totalTokenCount 추출
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    // ~/.gemini/settings.json의 hooks.AfterModel에 등록할 설정 반환
  }
}
```

**CodexAdapter** (`src/adapter/codex-adapter.ts`):

```typescript
class CodexAdapter implements ProviderAdapter {
  readonly name = 'codex';
  readonly configDir = path.join(os.homedir(), '.codex');
  readonly supportsStatusLine = false;

  async parseHookTokens(hookEvent: string, stdin: string): Promise<number> {
    // Stop: stdin에서 transcript_path 추출 → rollout JSONL 파싱
    // turn.completed 이벤트의 usage 합산
  }

  generateHookConfig(distDir: string): ProviderHookConfig {
    // ~/.codex/hooks.json의 Stop 이벤트에 등록할 설정 반환
  }
}
```

## Hook Entry Points

### 파일 구조

```
src/hooks/
  common/
    session-start.ts          # 기존 (provider-agnostic)
  claude/
    post-tool-use.ts          # 기존
    status-line-updater.ts    # 기존
  gemini/
    after-model.ts            # 신규
  codex/
    stop.ts                   # 신규
```

### Gemini AfterModel Hook (`src/hooks/gemini/after-model.ts`)

1. stdin에서 JSON 파싱 → `usageMetadata.totalTokenCount` 추출
2. 로컬 스토어에서 이전 누적값과 비교 → 델타 계산
3. `calcTokenExp(delta)` → EXP 계산
4. `logExp()` 호출 (metadata에 `provider: 'gemini'` 포함)
5. 로컬 스토어 업데이트

### Codex Stop Hook (`src/hooks/codex/stop.ts`)

1. stdin에서 JSON 파싱 → `transcript_path` 추출
2. rollout JSONL 파일 읽기
3. `turn.completed` 이벤트들에서 `usage.input_tokens + output_tokens` 합산
4. `calcTokenExp(total)` → EXP 계산
5. `logExp()` 호출 (metadata에 `provider: 'codex'` 포함)
6. 로컬 스토어 업데이트

## Data Model Changes

### exp_history.metadata

```typescript
interface ExpHistoryMetadata {
  provider: 'claude' | 'gemini' | 'codex';
  source: 'auto';
  tokens: number;
}
```

기존 Claude 데이터는 이미 `provider: 'claude'`를 포함하고 있어 하위 호환성 유지.

### Local Store

`~/.myhpmp/data.json`은 변경 없음 — 통합 EXP/레벨만 저장. 프로바이더별 데이터는 exp_history에만 존재.

## CLI Changes

### `myhpmp setup` 변경

프로바이더 복수 선택 지원:

```
$ myhpmp setup
? 어떤 AI 도구를 사용하시나요? (복수 선택, 스페이스로 선택)
  ◉ Claude Code
  ◉ Gemini CLI
  ◯ Codex CLI
```

각 선택된 프로바이더에 대해:
1. `getProvider(name)` → 어댑터 로드
2. `adapter.generateHookConfig(distDir)` → hook 설정 생성
3. 해당 프로바이더의 설정 파일에 hook 등록

### `myhpmp dashboard` (신규)

인터랙티브 TUI 대시보드:

```
  All       Claude    Gemini    Codex
  ───────────────────────────────────
  Date         Tokens       EXP
  2026-04-14   12,500        12
  2026-04-13    8,300         8
  2026-04-12   24,100        24
  2026-04-11    5,600         5
  ...

  ←→ 탭 이동  ↑↓ 스크롤  q 종료
```

- 상단 탭: All (전체 합산) + 프로바이더별
- 테이블 컬럼: Date, Tokens, EXP (MVP)
- 데이터 소스: exp_history 테이블에서 provider별 필터링 조회
- 기술 스택: **ink** (React for CLI)

### `myhpmp usage` 변경

기존 usage 명령어에 프로바이더별 요약 추가:

```
📊 Usage Summary
  Total EXP: 1,250 | Lv.8
  Claude: 890 EXP (124,500 tokens)
  Gemini: 260 EXP (38,200 tokens)
  Codex:  100 EXP (14,800 tokens)
```

## Setup Flow per Provider

### Gemini CLI Hook 설정

`~/.gemini/settings.json`에 추가:

```json
{
  "hooks": {
    "AfterModel": [
      {
        "command": "node /path/to/dist/hooks/gemini/after-model.js"
      }
    ]
  }
}
```

### Codex CLI Hook 설정

`~/.codex/hooks.json`에 추가:

```json
{
  "hooks": {
    "Stop": [
      {
        "command": "node /path/to/dist/hooks/codex/stop.js"
      }
    ]
  }
}
```

### Claude Code Hook 설정 (기존)

변경 없음. 기존 `PostToolUse` + `SessionStart` hook 유지.

## Migration & Compatibility

- 기존 Claude 전용 사용자는 아무 변경 없이 동작
- `myhpmp setup` 재실행 시 추가 프로바이더 선택 가능
- 기존 exp_history 데이터는 `provider: 'claude'`가 이미 포함되어 있으므로 마이그레이션 불필요
- ProviderAdapter 인터페이스 변경 시 claude-adapter도 함께 업데이트

## Future Extensions

- **Cursor 지원**: hook에 토큰 데이터 추가 시 `cursor-adapter.ts` 구현
- **토큰 세분화**: Input/Output/Cache 컬럼 추가
- **Cost 계산**: 프로바이더별 토큰 단가 적용
- **웹 대시보드 연동**: exp_history의 provider 필드로 프로바이더별 차트
- **차트/그래프**: TUI에 sparkline이나 bar chart 추가
