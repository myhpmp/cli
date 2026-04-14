import { LocalStore } from '../data/local-store.js';
import { getLevelInfo } from '../core/level-system.js';
import { computeStreak } from '../core/stats-aggregator.js';
import { renderDetailView } from '../display/detail-view.js';
import { detectLocale } from '../i18n/index.js';
import { AuthManager } from '../auth/auth-manager.js';
import { fetchClaudeUsage, utilizationToPercent, resetsAtToMinutes } from '../data/claude-usage.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

async function main() {
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

  const levelInfo = getLevelInfo(stats.totalExp);

  // Fetch real Claude usage data
  const usage = await fetchClaudeUsage();
  const hpPercent = usage ? utilizationToPercent(usage.fiveHour.utilization) : 100;
  const mpPercent = usage ? utilizationToPercent(usage.sevenDay.utilization) : 100;
  const resetMinutes = usage ? resetsAtToMinutes(usage.fiveHour.resetsAt) : 0;

  if (stats.totalExp === 0 && stats.totalSessions === 0) {
    console.log('👋 Welcome to My HP/MP!\n');
    console.log('📝 First steps:');
    console.log('  1) myhpmp setup   — Install hooks into Claude Code');
    console.log('  2) Use your AI tool — EXP tracks automatically');
    console.log('  3) myhpmp init    — (Optional) Enable cloud sync\n');
  }

  const syncActive = await authManager.isAuthenticated();

  const output = renderDetailView({
    username: stats.username,
    level: levelInfo.level,
    hpPercent,
    hpUsed: hpPercent,
    hpTotal: 100,
    resetMinutes,
    mpPercent,
    mpUsed: mpPercent,
    mpTotal: 100,
    ctxPercent: 0, // context not available via API
    ctxUsed: 0,
    ctxTotal: 1000000,
    expCurrent: levelInfo.currentLevelExp,
    expNeeded: levelInfo.expForNextLevel,
    nextLevel: levelInfo.level + 1,
    totalExp: stats.totalExp,
    totalSessions: stats.totalSessions,
    streakDays: computeStreak(stats.streakDays, stats.lastActiveDate),
    syncActive,
  }, locale);

  console.log(output);
}

main().catch(console.error);
