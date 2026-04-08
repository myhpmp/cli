import { LocalStore } from '../../data/local-store.js';
import { getLevelInfo, getTierForLevel, getStars, getTierEmoji, getTierTitle } from '../../core/level-system.js';
import { renderStatusLine } from '../../display/status-line.js';
import { detectLocale } from '../../i18n/index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { fetchClaudeUsage, utilizationToPercent, resetsAtToMinutes } from '../../data/claude-usage.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

export async function getStatusLine(): Promise<string> {
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
  const tier = getTierForLevel(levelInfo.level);
  const titleEmoji = getTierEmoji(tier.tierIndex);
  const titleName = getTierTitle(tier.tierIndex, locale);

  // Fetch real Claude usage data
  const usage = await fetchClaudeUsage();
  const hpPercent = usage ? utilizationToPercent(usage.fiveHour.utilization) : 100;
  const mpPercent = usage ? utilizationToPercent(usage.sevenDay.utilization) : 100;
  const resetMinutes = usage ? resetsAtToMinutes(usage.fiveHour.resetsAt) : 0;

  return renderStatusLine({
    titleEmoji,
    titleName,
    level: levelInfo.level,
    stars: getStars(levelInfo.level),
    hpPercent,
    resetMinutes,
    mpPercent,
    ctxPercent: 0,
    streakDays: stats.streakDays,
  }, locale);
}

async function main() {
  const line = await getStatusLine();
  console.log(line);
}

main().catch(console.error);
