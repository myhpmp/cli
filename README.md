# @myhpmp/cli

[한국어](./README.ko.md) | English

RPG-style gamified usage dashboard for AI coding tools.

Turn your AI coding tool usage into a game — track your level, HP, MP, EXP as you code.

<p align="center">
  <img src="./assets/statusline-preview.svg" alt="Status Line Preview" width="100%"/>
</p>

## Supported Tools

| Tool | Tracking | Method |
|------|----------|--------|
| **Claude Code** | Auto | PostToolUse hook |
| **Gemini CLI** | Auto | AfterModel hook |
| **Codex CLI** | Auto | Stop hook |

## Quick Start

```bash
npm install -g @myhpmp/cli
```

### 1. Install hooks

```bash
myhpmp setup
```

Select which AI tools to configure. Hooks are installed automatically to track token usage.

### 2. Set your language

```bash
myhpmp locale
```

Supports Korean and English. Auto-detects from system locale if skipped.

### 3. Restart your AI tools

That's it. EXP tracking starts automatically on your next session.

### 4. (Optional) Enable cloud sync

```bash
myhpmp init
```

Sync stats across devices via GitHub OAuth. Your RPG progress follows you everywhere.

## Dashboard

Run `myhpmp usage` for the RPG dashboard:

<p align="center">
  <img src="./assets/usage-preview.svg" alt="Usage Dashboard Preview" width="640"/>
</p>

Run `myhpmp dashboard` for the interactive TUI with per-provider breakdown:

```
  All       Claude    Gemini    Codex
  ───────────────────────────────────
  Date         Tokens       EXP
  2026-04-14   12,500        12
  2026-04-13    8,300         8
  2026-04-12   24,100        24

  ←→ tab  ↑↓ scroll  q quit
```

## Stats

| Stat | Description |
|------|-------------|
| **❤️ HP** | 5-hour rate limit remaining (%) + reset timer |
| **💙 MP** | 7-day weekly limit remaining (%) + reset timer |
| **🧠 CTX** | Current context window usage (%) |
| **⭐ EXP** | Experience points toward next level |

## Level Tiers

| Level | Title | EXP/Level | Cumulative |
|-------|-------|-----------|------------|
| 1-5 | 🌱 Prompt Newbie | 100 | 500 |
| 6-10 | ⚔️ Token Explorer | 300 | 2,000 |
| 11-15 | 🛠️ Prompt Engineer | 600 | 5,000 |
| 16-20 | 🏗️ Context Architect | 1,200 | 11,000 |
| 21-30 | 🔮 Prompt Sorcerer | 3,500 | 46,000 |
| 31-40 | 👑 Model Master | 8,000 | 126,000 |
| 41-50 | 🐉 Context Overlord | 15,000 | 276,000 |
| 50+ | ⚡ Synthetic Mind | 25,000 | ∞ |

Early levels fly by. Late tiers require serious dedication.

## EXP Sources

| Action | EXP |
|--------|-----|
| Token usage | 1 EXP per 1K tokens |

EXP is tracked per-provider and stored with provider metadata for analytics on the web dashboard.

## Commands

| Command | Description |
|---------|-------------|
| `myhpmp setup` | Configure hooks (select AI tools) |
| `myhpmp usage` | Show detailed RPG dashboard |
| `myhpmp dashboard` | Interactive TUI dashboard (provider breakdown) |
| `myhpmp sync` | Manually sync stats to cloud |
| `myhpmp statusline` | Toggle status line on/off (Claude Code only) |
| `myhpmp locale` | Change display language (한국어/English) |
| `myhpmp init` | Set up authentication (cross-device sync) |
| `myhpmp uninstall` | Remove all hooks and optionally local data |

## Cross-Device Sync

Sync your stats (level, EXP) across multiple machines:

```bash
myhpmp init
```

Supports **GitHub OAuth**.

| Timing | Behavior |
|--------|----------|
| Session start | Pull latest from cloud |
| Every 5 minutes | Auto-sync during active use |
| `myhpmp sync` | Manual sync on demand |

Data is stored locally at `~/.myhpmp/data.json` and works fully offline. Cloud sync is best-effort — local data is always preserved.

## Customization

### Status line order

Customize which segments appear and in what order via `~/.myhpmp/config.json`:

```json
{
  "statusLineOrder": ["title", "hp", "mp", "ctx", "project"]
}
```

Available segments: `title`, `hp`, `mp`, `ctx`, `project`

### i18n

```
📂 ~/…/myhpmp-cli (main*)
KO: 🔮 프롬프트 소서러 Lv.21 ★ | ❤️ 80% ⏱️4h34m | 💙 64% ⏱️5일 | 🧠 2%

📂 ~/…/myhpmp-cli (main*)
EN: 🔮 Prompt Sorcerer Lv.21 ★ | ❤️ 80% ⏱️4h34m | 💙 64% ⏱️5d | 🧠 2%
```

## Requirements

- Node.js >= 18
- At least one supported AI coding tool

## Supported Platforms

- **Windows** / **macOS** / **Linux**

## License

MIT
