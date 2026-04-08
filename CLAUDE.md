# @myhpmp/cli

RPG-style gamified usage dashboard for AI coding tools (Claude Code, Codex CLI).

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
├── adapter/           # Provider adapters (Claude, Codex)
│   ├── provider.ts    # ProviderAdapter interface
│   ├── claude-adapter.ts
│   ├── codex-adapter.ts
│   └── index.ts       # Factory + registry
├── auth/              # OAuth + token management
├── commands/          # CLI commands (setup, init, usage, sync, etc.)
├── core/              # Re-exports from @myhpmp/core
├── data/              # Local store, sync engine, exp logger, pending queue
│   └── providers/     # DB interface + Supabase implementation
├── display/           # Status line + detail view rendering
├── hooks/             # Hook entry points
│   ├── common/        # Shared hooks (session-start)
│   ├── claude/        # Claude-specific (post-tool-use, session-end)
│   └── codex/         # Codex-specific (session-end with JSONL parsing)
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

## Git Conventions

- **Branch**: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/` prefixes
- **Commit**: [Conventional Commits](https://www.conventionalcommits.org/) format
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `docs:` documentation
  - `chore:` build, CI, config
  - `ci:` CI/CD changes
- **PR**: squash merge to main
- **Deploy**: push `v*` tag → CI builds, tests, publishes to npm
- **Branches**: auto-deleted after merge

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
myhpmp setup      — Configure hooks (Claude Code / Codex CLI)
myhpmp init       — Set up authentication (cross-device sync)
myhpmp usage      — Show detailed usage stats
myhpmp sync       — Manually sync stats to cloud
myhpmp statusline — Toggle status line on/off (Claude Code only)
myhpmp locale     — Change display language (한국어/English)
```
