# Web Dashboard Design Spec

## Overview

RPG-style web dashboard for claude-hp-mp. Displays user stats and daily activity heatmap from Supabase DB. Separate repo, deployed on Vercel.

## Decisions

| Item | Decision |
|------|----------|
| Repo | `claude-hp-mp-web` (separate from CLI) |
| Stack | Next.js (App Router) + Tailwind CSS + Vercel |
| Design | Dark RPG theme (glow effects, progress bars) |
| Convention | kebab-case, singular for all folders and files |
| Route | `/[user-id]` — public profile page |
| Data source | Supabase DB direct query (server-side) |

## Pages

### `/[user-id]` — Public Profile

Displays a single user's RPG dashboard.

**Stats section:**
- Title emoji + title name + level + stars
- EXP progress bar (current / next level)
- Total EXP
- Total sessions
- Streak days
- Tier badge

**Activity heatmap:**
- GitHub-style contribution grid (365 days)
- Color intensity based on daily EXP gained
- Tooltip on hover: date + EXP gained

### `/` — Landing / Redirect

Simple landing page with project description and link to GitHub repo.

## DB Changes (Supabase)

### New table: `daily_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (FK → auth.users) | User reference |
| `date` | date | Activity date |
| `exp_gained` | integer | EXP earned that day |
| `sessions` | integer | Sessions completed that day |
| `tokens_used` | integer | Tokens consumed that day |
| `created_at` | timestamptz | Row creation time |

**Unique constraint:** `(user_id, date)` — one row per user per day.

**RLS policies:**
- SELECT: allow all (public profiles)
- INSERT/UPDATE: only `auth.uid() = user_id`
- DELETE: deny all

### Update `user_stats` RLS

- SELECT: allow all (public profiles)
- INSERT/UPDATE: only `auth.uid() = user_id`
- DELETE: deny all

## CLI Changes (claude-hp-mp)

### session-end hook

Add daily log upsert after existing session EXP logic:

```
upsert daily_logs set:
  exp_gained += session EXP
  sessions += 1
  tokens_used += session tokens
where user_id = current user, date = today
```

### post-tool-use hook

Add token tracking to daily log:

```
upsert daily_logs set:
  exp_gained += token EXP
  tokens_used += tokens used
where user_id = current user, date = today
```

## Tech Stack

- **Next.js 15** (App Router, server components)
- **Tailwind CSS 4** (dark theme, custom RPG colors)
- **@supabase/supabase-js** (server-side queries)
- **Vercel** (deployment, edge functions)

## Project Structure

```
claude-hp-mp-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing page
│   └── [user-id]/
│       └── page.tsx                # Profile dashboard
├── component/
│   ├── stat-card.tsx
│   ├── exp-progress-bar.tsx
│   ├── activity-heatmap.tsx
│   ├── tier-badge.tsx
│   └── streak-counter.tsx
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── level-system.ts             # Level/tier calculation (ported from CLI)
│   └── type.ts                     # Shared types
├── public/
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

## Design Tokens (Dark RPG Theme)

- Background: `#0a0a0f` (deep dark)
- Card background: `#12121a` with subtle border glow
- Primary text: `#e2e8f0`
- HP color: `#ef4444` (red glow)
- MP color: `#3b82f6` (blue glow)
- EXP color: `#eab308` (gold glow)
- Streak color: `#f97316` (orange glow)
- Heatmap: 5-step gradient from `#1a1a2e` to `#eab308`

## Future Extensions

- `/api/badge/[user-id]` — SVG badge for GitHub README
- Leaderboard page
- Activity graph (line chart over time)

## Out of Scope

- Authentication on web (read-only public profiles)
- User settings or profile editing
- Real-time updates (static server render is fine)
