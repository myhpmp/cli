#!/usr/bin/env node
/**
 * Claude Code Status Line Script
 *
 * Reads JSON from stdin (provided by Claude Code),
 * combines with local EXP/level data,
 * outputs a single-line RPG status bar.
 *
 * Usage in ~/.claude/settings.json:
 * {
 *   "statusLine": {
 *     "type": "command",
 *     "command": "node ~/.my-hp-mp/dist/statusline.js"
 *   }
 * }
 */
import { LocalStore } from './data/local-store.js';
import { getLevelInfo, getTierForLevel, getStars } from './core/level-system.js';
import { renderStatusLine } from './display/status-line.js';
import { createI18n, detectLocale } from './i18n/index.js';
import { AuthManager } from './auth/auth-manager.js';
import { fetchClaudeUsage, utilizationToPercent, resetsAtToMinutes } from './data/claude-usage.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.my-hp-mp');
const TITLE_KEYS = [1, 6, 11, 16, 21, 31, 41, 51];

interface ClaudeStatusInput {
  context_window?: {
    used_percentage?: number;
    remaining_percentage?: number;
  };
  rate_limits?: {
    five_hour?: { used_percentage?: number; resets_at?: number };
    seven_day?: { used_percentage?: number; resets_at?: number };
  };
  model?: {
    display_name?: string;
  };
}

const MAX_INPUT_SIZE = 1_000_000; // 1MB

async function main() {
  // Read JSON from stdin (Claude Code pipes this)
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > MAX_INPUT_SIZE) break;
  }

  let statusInput: ClaudeStatusInput = {};
  try {
    statusInput = JSON.parse(input);
  } catch {
    // If no valid JSON, use defaults
  }


  // Extract real-time data from Claude Code
  const ctxPercent = Math.round(statusInput.context_window?.used_percentage ?? 0);

  // If stdin has rate_limits, use them; otherwise fallback to API
  let hpPercent: number;
  let mpPercent: number;
  let resetMinutes = 0;

  if (statusInput.rate_limits?.five_hour) {
    hpPercent = Math.max(0, Math.round(100 - (statusInput.rate_limits.five_hour.used_percentage ?? 0)));
    mpPercent = Math.max(0, Math.round(100 - (statusInput.rate_limits?.seven_day?.used_percentage ?? 0)));
    // resets_at comes as epoch seconds from stdin
    const resetsAtEpoch = statusInput.rate_limits.five_hour.resets_at;
    if (resetsAtEpoch) {
      const diff = resetsAtEpoch * 1000 - Date.now();
      resetMinutes = Math.max(0, Math.round(diff / 60_000));
    }
  } else {
    const usage = await fetchClaudeUsage();
    if (usage) {
      hpPercent = utilizationToPercent(usage.fiveHour.utilization);
      mpPercent = utilizationToPercent(usage.sevenDay.utilization);
      resetMinutes = resetsAtToMinutes(usage.fiveHour.resetsAt);
    } else {
      hpPercent = 100;
      mpPercent = 100;
    }
  }

  // Load EXP/level data from local store
  const authManager = new AuthManager(DATA_DIR);
  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  let locale: string;
  try {
    const config = await authManager.loadConfig();
    locale = config.locale ?? detectLocale();
  } catch {
    locale = detectLocale();
  }

  const i18n = createI18n(locale);
  const levelInfo = getLevelInfo(stats.totalExp);
  const tier = getTierForLevel(levelInfo.level);
  const titleKey = TITLE_KEYS[tier.tierIndex];
  const titleFull = i18n.t(`title.${titleKey}`);
  const titleEmoji = titleFull.split(' ')[0];
  const titleName = titleFull.split(' ').slice(1).join(' ');

  const line = renderStatusLine({
    titleEmoji,
    titleName,
    level: levelInfo.level,
    stars: getStars(levelInfo.level),
    hpPercent,
    resetMinutes,
    mpPercent,
    ctxPercent,
    streakDays: stats.streakDays,
  }, i18n);

  process.stdout.write(line);
}

main().catch(() => {
  // Silent fail — don't break Claude Code status line
  process.stdout.write('🎮 ...');
});
