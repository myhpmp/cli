import { LocalStore } from '../../data/local-store.js';
import { getLevelInfo, getTierForLevel, getStars, getTierEmoji, getTierTitle } from '../../core/level-system.js';
import { renderStatusLine } from '../../display/status-line.js';
import { detectLocale } from '../../i18n/index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { fetchClaudeUsage, utilizationToPercent, resetsAtToMinutes } from '../../data/claude-usage.js';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

export async function getStatusLine(): Promise<string> {
  const authManager = new AuthManager(DATA_DIR);
  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  let locale: string;
  let statusLineOrder: import('../../auth/auth-manager.js').StatusLineSegment[] | undefined;
  try {
    const config = await authManager.loadConfig();
    locale = config.locale ?? detectLocale();
    statusLineOrder = config.statusLineOrder;
  } catch {
    locale = detectLocale();
  }

  const levelInfo = getLevelInfo(stats.totalExp);
  const tier = getTierForLevel(levelInfo.level);
  const titleEmoji = getTierEmoji(tier.tierIndex);
  const titleName = getTierTitle(tier.tierIndex, locale);

  // Fetch real Claude usage data
  const usage = await fetchClaudeUsage();
  const hpPercent = usage ? utilizationToPercent(usage.fiveHour.utilization) : 100;
  const mpPercent = usage ? utilizationToPercent(usage.sevenDay.utilization) : 100;
  const resetMinutes = usage ? resetsAtToMinutes(usage.fiveHour.resetsAt) : 0;
  let weeklyResetDays = 0;
  if (usage) {
    const diff = new Date(usage.sevenDay.resetsAt).getTime() - Date.now();
    weeklyResetDays = Math.max(0, Math.ceil(diff / (24 * 60 * 60_000)));
  }

  let gitBranch: string | null = null;
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    const dirty = execSync('git status --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    gitBranch = branch + (dirty.length > 0 ? '*' : '');
  } catch {
    // Not a git repo or git not available
  }

  return renderStatusLine({
    titleEmoji,
    titleName,
    level: levelInfo.level,
    stars: getStars(levelInfo.level),
    hpPercent,
    resetMinutes,
    mpPercent,
    weeklyResetDays,
    ctxPercent: 0,
    streakDays: stats.streakDays,
    projectName: path.basename(process.cwd()),
    gitBranch,
  }, locale, statusLineOrder);
}

async function main() {
  const line = await getStatusLine();
  console.log(line);
}

main().catch(console.error);
