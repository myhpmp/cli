# my-hp-mp

[한국어](./README.ko.md) | English

RPG-style gamified usage dashboard for AI coding tools.

Turn your AI coding tool usage into a game — track your level, HP (session limit), MP (weekly limit), EXP, streaks, and earn titles as you code.

## Supported Tools

- **Claude Code** — full support (real-time token tracking + status line)
- **Codex CLI** — full support (session-end token tracking)

## Status Line (Claude Code)

Always visible at the bottom of Claude Code:

```
⚔️ Apprentice Warrior Lv.9 ★★★ | ❤️ 43% ⏱️2h30m | 💙 76% | 🧠 25% | 🔥7d
```

## Detail View

Run `my-hp-mp usage` for the full dashboard:

```
🎮 ⚔️ Apprentice Warrior Lv.9 ★★★            🔥 Streak: 7d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❤️ HP  ████░░░░░░   43%  ⏱️ 2h30m
💙 MP  ████████░░   76%
🧠 CTX ███░░░░░░░   25%  (250K / 1.0M context)
⭐ EXP ██████░░░░   62%  (186 / 300 → Lv.10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total EXP: 2,886  |  Total Sessions: 47 sessions
```

## Stats

| Stat | Description |
|------|-------------|
| **❤️ HP** | 5-hour session limit remaining (%) + reset timer |
| **💙 MP** | 7-day weekly limit remaining (%) |
| **🧠 CTX** | Current context window usage (%) |
| **🔥 Streak** | Consecutive days of usage |
| **⭐ EXP** | Experience points toward next level |

## Level Tiers

| Level | Title | EXP/Level | Cumulative |
|-------|-------|-----------|------------|
| 1-5 | 🌱 Novice Adventurer | 100 | 500 |
| 6-10 | ⚔️ Apprentice Warrior | 300 | 2,000 |
| 11-15 | 🛡️ Skilled Knight | 600 | 5,000 |
| 16-20 | 🧙 Mage | 1,200 | 11,000 |
| 21-30 | 🔮 Archmage | 3,500 | 46,000 |
| 31-40 | 👑 Grand Archmage | 8,000 | 126,000 |
| 41-50 | 🐉 Legendary Code Dragon | 15,000 | 276,000 |
| 50+ | ⚡ Transcendent | 25,000 | ∞ |

Early levels fly by. Late tiers require serious dedication — expect ~8 months of daily use to reach ⚡ Transcendent.

## EXP Sources

| Action | EXP |
|--------|-----|
| Token usage | 1 EXP per 1K tokens |
| Session complete | 25 EXP |
| Streak bonus | streak days × 5 EXP (cap: 30 days = 150 max) |
| Weekly 70%+ usage | 100 EXP |

EXP from all supported tools is combined into a single total. Use Claude and Codex together — it all adds up.

## Quick Start

```bash
# Install and auto-configure (select Claude Code, Codex, or both)
npx my-hp-mp setup

# Set your display language
npx my-hp-mp locale

# Restart your AI coding tool to start tracking
```

That's it! EXP tracking starts via hooks. Status line is available for Claude Code.

## Commands

| Command | Description |
|---------|-------------|
| `npx my-hp-mp setup` | Auto-configure hooks (Claude Code / Codex CLI) |
| `npx my-hp-mp usage` | Show detailed RPG dashboard |
| `npx my-hp-mp sync` | Manually sync stats to cloud |
| `npx my-hp-mp statusline` | Toggle status line on/off (Claude Code) |
| `npx my-hp-mp statusline on` | Enable status line |
| `npx my-hp-mp statusline off` | Disable status line |
| `npx my-hp-mp locale` | Change display language (한국어/English) |
| `npx my-hp-mp init` | Set up authentication (cross-device sync) |

## Cross-Device Sync

Sync your stats (level, EXP, streaks) across multiple machines:

```bash
npx my-hp-mp init
```

Supports **GitHub OAuth** and **Google OAuth** authentication.

### How sync works

| Timing | Behavior |
|--------|----------|
| Session start | Pull latest from cloud → update local |
| Every 5 minutes | Auto-sync during active use |
| Session end | Push final stats to cloud |
| `npx my-hp-mp sync` | Manual sync on demand |

Data is stored locally at `~/.my-hp-mp/data.json` and works offline. Cloud sync is best-effort — if it fails, local data is preserved and synced on next opportunity. If local EXP is lower than remote (e.g. after reinstall), remote data is always preserved.

## Requirements

- Node.js >= 18
- One or more supported AI coding tools:
  - Claude Code (Pro/Max subscription)
  - Codex CLI (OpenAI API key)

## Supported Platforms

- **Windows**
- **macOS**
- **Linux**

## i18n

Supports Korean and English. Set your language with `npx my-hp-mp locale`, or it auto-detects from your system locale.

```
KO: ⚔️ 견습 전사 Lv.9 ★★★ | ❤️ 43% ⏱️2h30m | 💙 76% | 🧠 25% | 🔥7일
EN: ⚔️ Apprentice Warrior Lv.9 ★★★ | ❤️ 43% ⏱️2h30m | 💙 76% | 🧠 25% | 🔥7d
```

## How It Works

1. **Hooks** — Each supported tool's hook system tracks token usage, sessions, and streaks
2. **Adapter Pattern** — Claude Code and Codex CLI each have their own adapter for parsing tool-specific data
3. **Status Line** — Claude Code pipes session JSON to the status line script, rendered as RPG HUD
4. **Local Store** — All data saved to `~/.my-hp-mp/data.json` (works offline)
5. **Cloud Sync** — Supabase integration with auto-sync. Server-side EXP validation prevents manipulation

## License

MIT
