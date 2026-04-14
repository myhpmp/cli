# @myhpmp/cli

RPG-style gamified usage dashboard for Claude Code.

## Project Overview

- **npm**: `@myhpmp/cli` → `myhpmp` command
- **Data dir**: `~/.myhpmp/`
- **Shared logic**: `@myhpmp/core` (level system, EXP calculator, tier data)
- **DB**: Supabase (user_stats, exp_history)
- **Web dashboard**: https://myhpmp.com (separate repo: myhpmp/web)

## Code Conventions

- **Language**: TypeScript (strict mode)
- **Module**: ESM (`"type": "module"`, `.js` extensions in imports)
- **Naming**: kebab-case for files/folders, camelCase for variables/functions
- **No `any`**: Use proper types. Use `unknown` + narrowing if needed.
- **Imports**: Relative paths with `.js` extension (`'./core/level-system.js'`)
- **Error handling**: Hooks must never crash — use silent `catch` with fallback. Commands can throw.

## Project Structure

```
src/
├── adapter/           # Provider adapters (Claude, Gemini, Codex)
│   ├── provider.ts    # ProviderAdapter interface
│   ├── claude-adapter.ts
│   └── index.ts       # Factory + registry
├── auth/              # OAuth + token management
├── commands/          # CLI commands (setup, init, usage, sync, etc.)
├── core/              # Re-exports from @myhpmp/core
├── data/              # Local store, sync engine, exp logger, pending queue
│   └── providers/     # DB interface + Supabase implementation
├── display/           # Status line + detail view rendering
├── hooks/             # Hook entry points
│   ├── common/        # Shared hooks (session-start, track-tokens)
│   ├── claude/        # Claude-specific (post-tool-use, status-line-updater)
│   ├── gemini/        # Gemini CLI (after-model)
│   └── codex/         # Codex CLI (stop)
├── i18n/              # CLI-only translations (status labels, units)
├── cli.ts             # CLI entry point
├── config.ts          # Supabase config loader
└── statusline.ts      # Claude Code status line script
```

## Core Package (@myhpmp/core)

Level system, EXP calculator, tier titles/emojis are in `@myhpmp/core`.
CLI re-exports them via `src/core/level-system.ts` and `src/core/exp-calculator.ts`.
**Never duplicate core logic in CLI** — always import from core.

## Sync Architecture

- **Server is the source of truth** for totalExp (computed by DB trigger)
- CLI never pushes totalExp — only inserts to `exp_history` via `logExp()`
- DB trigger `recompute_total_exp` auto-calculates `base_exp + SUM(exp_history)`
- Sync flow: flush pending queue → push metadata → pull server state
- `logExp()` failure → queued in `~/.myhpmp/pending-exp.json` (max 1000 entries)

## Git Workflow

**main 브랜치는 보호됨 — direct push 금지. 반드시 PR을 통해서만 merge.**

**PR 생성 전에 반드시 `/review` 를 실행하여 팀 리뷰를 통과해야 한다. 리뷰 없이 PR/merge/배포 금지.**

```
feature branch → `/review` 팀 리뷰 통과 → PR → CI 통과 → squash merge → (필요 시) v* 태그 → npm 배포
```

1. **Branch**: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/` prefix로 생성
2. **Commit**: [Conventional Commits](https://www.conventionalcommits.org/) format
   - `feat:` new feature
   - `fix:` bug fix
   - `refactor:` code restructuring
   - `docs:` documentation
   - `chore:` build, CI, config
   - `ci:` CI/CD changes
3. **PR**: CI(test) 통과 필수 → squash merge
4. **Tag & Deploy**: 태그 기준에 따라 `v*` 태그 push → CI가 build + test + npm publish
5. **Branches**: merge 후 삭제

### 태그(배포) 기준

| 태그 | 언제 | 예시 |
|------|------|------|
| **patch** (v1.2.X) | 버그 수정, 사용자에게 영향 있는 fix | `fix:` 커밋 |
| **minor** (v1.X.0) | 새 기능, 동작 변경, 구조 변경 | `feat:`, `refactor:` 커밋 |
| **major** (vX.0.0) | breaking change (기존 사용자 설정/명령 호환 깨짐) | 드물게 |
| **태그 안 함** | 코드 변경 없음 (docs, chore, config, 프로세스 문서) | `docs:`, `chore:` 커밋 |

**절대 하지 말 것:**
- main에 직접 push
- CI 통과 전 merge
- 태그 없이 npm publish
- 코드 변경 없는 커밋에 태그 달기

## Testing

- **Framework**: Vitest
- **Run**: `npm test`
- **All tests must pass** before committing
- Tests in `tests/` mirror `src/` structure

## Security Rules

- Never hardcode secrets in source code
- `config.json` must be written with `mode: 0o600`
- OAuth state parameter required for CSRF prevention
- Supabase responses must be validated (type coercion + bounds check)
- stdin input limited to 1MB in hooks
- Token EXP capped at 1000 per record (`Math.min(exp, 1000)`)
- `exp_history` metadata must include `provider` field

## Commands Reference

```
myhpmp setup      — Configure hooks (Claude Code)
myhpmp init       — Set up authentication (cross-device sync)
myhpmp usage      — Show detailed usage stats
myhpmp sync       — Manually sync stats to cloud
myhpmp statusline — Toggle status line on/off (Claude Code only)
myhpmp dashboard  — Interactive TUI dashboard (provider breakdown)
myhpmp locale     — Change display language (한국어/English)
```
